import { queueTokenInHeader, viaAccountGateway } from "@/core/data/credentials/account-gateway-mode.utils";
import type { HttpClient } from "@/core/data/http/http.client";
import type { AppConfig } from "@/core/domain/app-config.model";
import { toAppError } from "@/core/domain/app-error";
import type { CaptchaProtocol } from "@/core/domain/captcha.protocol";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import { QUEUE_POLL_FALLBACK_MS } from "../domain/queue.constants";
import type { QueueProtocol } from "../domain/queue.protocol";
import type { QueueEvent } from "../domain/queue-event.model";
import { pollAfterMs } from "../domain/queue-poll.rules";
import type { QueueState } from "../domain/queue-state.model";
import type { QueueTicketCache } from "./memory-queue-ticket.service";
import {
  queueEventSchema,
  queueJoinEventSchema,
  queueJoinSchema,
  queueMeSchema,
  queueServingSchema,
  toQueueState,
  waitingState,
  type QueueTicket,
} from "./queue-state.schema";

const queuePath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/queue`;

/**
 * Alur antrian (kontrak §3.1–3.4, ADR-0016): `join` sekali per kunjungan (server menyetel cookie `queue_token`) dan
 * hanya menyimpan tiket; posisi awal dihitung dari `now_serving` di respons join. Setelah itu stream SSE yang
 * mengantar `now_serving`. `GET /queue/me` dipanggil saat giliran tiba, dan `GET /queue/serving` hanya polling
 * cadangan selama stream tidak tersambung.
 * Tamu wajib mengirim `X-Device-Id` di join dan `/queue/me` supaya tempat dan grant-nya terikat ke perangkat (kontrak).
 * Bila cookie tidak bisa dipakai (`apiCredentials = "omit"`), token dari respons join disimpan dan dikirim sebagai
 * `X-Queue-Token`, jalur yang sama dengan klien mobile.
 */
export function createHttpQueueService({
  appConfig,
  httpClient,
  bffHttpClient,
  credentialStore,
  queueTicketCache,
  captcha,
}: {
  appConfig: AppConfig;
  httpClient: HttpClient;
  bffHttpClient: HttpClient;
  credentialStore: CredentialStoreProtocol;
  queueTicketCache: QueueTicketCache;
  captcha: CaptchaProtocol;
}): QueueProtocol {
  const tokenInHeader = queueTokenInHeader(appConfig);
  // Join dan `/queue/me` membawa Bearer akun lewat route same-origin (lihat `account-gateway-mode.utils.ts`);
  // `/queue/serving` publik dan tetap langsung ke API.
  const viaServer = viaAccountGateway(appConfig);
  const identityClient = viaServer ? bffHttpClient : httpClient;
  const identityPath = (path: string) => (viaServer ? `/account${path}` : path);

  function queueHeaders(eventId: string): Record<string, string> {
    const token = tokenInHeader ? credentialStore.queueToken(eventId) : null;
    return { "x-device-id": credentialStore.deviceId(), ...(token ? { "x-queue-token": token } : {}) };
  }

  /** Token antrian yang ditolak server tidak dikirim lagi; join berikutnya mendapat tempat baru (kontrak §3.1, v2.9). */
  function forget(eventId: string) {
    queueTicketCache.delete(eventId);
    credentialStore.clearQueueToken(eventId);
  }

  /** `POST /queue/join` ke server. Dipakai juga saat `/queue/me` dan `/queue/serving` belum punya tiket. */
  async function joinServer(eventId: string): Promise<QueueState> {
    // Token CAPTCHA diambil lebih dulu: join menolak tanpa token (400), dan nomor antrian dibagikan saat join.
    const event = await httpClient.get(`/events/${encodeURIComponent(eventId)}`, queueJoinEventSchema);
    const captchaToken = await captcha.solve(event.captcha);
    const joined = await identityClient.post(
      identityPath(`${queuePath(eventId)}/join`),
      { captcha_token: captchaToken },
      queueJoinSchema,
      {
        headers: queueHeaders(eventId),
        // `meta.error_code` lebih halus daripada status: 409 bisa SALE_NOT_OPEN, FULL_BOOKED, atau SOLD_OUT (§3.1).
        serverErrorCodes: {
          QUEUE_FULL: "QUEUE_FULL",
          FULL_BOOKED: "FULL_BOOKED",
          SALE_NOT_OPEN: "SALE_NOT_OPEN",
          SOLD_OUT: "SALE_CLOSED",
        },
        errorCodes: {
          400: "CAPTCHA_FAILED",
          403: "CAPTCHA_FAILED",
          409: "SALE_NOT_OPEN",
          410: "SALE_CLOSED",
          429: "RATE_LIMITED",
          503: "QUEUE_FULL",
        },
      },
    );
    if (tokenInHeader && joined.queueToken) credentialStore.saveQueueToken(eventId, joined.queueToken);
    // Laju belum diketahui di join; stream dan `/queue/serving` yang mengisinya.
    const ticket: QueueTicket = {
      ticketNo: joined.ticketNo,
      joinedPosition: joined.joinedPosition,
      queueToken: joined.queueToken,
      streamUrl: joined.streamUrl,
      eventName: event.name,
      ratePerMin: 0,
    };
    queueTicketCache.set(eventId, ticket);
    // Giliran sudah tiba (kontrak §3.1: position ≤ 0) atau join ulang bukan `QUEUED`: grant ada di `/queue/me`.
    const notQueued = joined.state !== undefined && joined.state !== "QUEUED";
    if (notQueued || ticket.ticketNo - joined.nowServing <= 0) return getOwnState(eventId);
    return waitingState(ticket, joined.nowServing);
  }

  async function getOwnState(eventId: string): Promise<QueueState> {
    const ticket = queueTicketCache.get(eventId);
    if (!ticket) return joinServer(eventId);
    try {
      const me = await identityClient.get(identityPath(`${queuePath(eventId)}/me`), queueMeSchema, {
        headers: queueHeaders(eventId),
        errorCodes: { 401: "QUEUE_TOKEN_INVALID" },
      });
      if (me.state === "QUEUED" && me.ticket_no !== ticket.ticketNo) {
        queueTicketCache.set(eventId, { ...ticket, ticketNo: me.ticket_no });
      }
      return toQueueState(ticket, me);
    } catch (error) {
      const failure = toAppError(error);
      if (failure.kind === "api" && failure.code === "QUEUE_TOKEN_INVALID") forget(eventId);
      throw error;
    }
  }

  async function getState(eventId: string): Promise<QueueState> {
    const ticket = queueTicketCache.get(eventId);
    if (!ticket) return joinServer(eventId);
    // `/queue/serving` bisa tidak tersedia (404 di gateway) padahal antrian jalan. `/queue/me` (kontrak §3.3) selalu
    // menjawab posisi atau grant, jadi dipakai sebagai cadangan kedua sebelum polling dianggap gagal.
    let serving;
    try {
      serving = await httpClient.get(`${queuePath(eventId)}/serving`, queueServingSchema);
    } catch {
      return getOwnState(eventId);
    }
    const known = { ...ticket, ratePerMin: Math.max(serving.ratePerMin, 0) };
    queueTicketCache.set(eventId, known);
    if (serving.saleState === "CLOSED")
      return { status: "ended", eventName: known.eventName, reason: "closed" };
    // Giliran tiba, atau tiket belum bernomor (join yang langsung diberi giliran): hanya `/queue/me` yang tahu.
    const position = known.ticketNo - serving.nowServing;
    if (position <= 0) return getOwnState(eventId);
    return waitingState(known, serving.nowServing, {
      fullBooked: serving.saleState === "FULL_BOOKED",
      retryAfterMs: pollAfterMs(position, serving.pollTiers, serving.pollAfterMs ?? QUEUE_POLL_FALLBACK_MS),
    });
  }

  /**
   * Join dari layar Waiting Room. Grant event ini masih dipegang (Back/Forward dari halaman booking, atau kembali ke
   * beranda lalu masuk lagi): customer sudah lewat antrian, jadi tanpa CAPTCHA dan tanpa menghabiskan jatah join.
   * Tujuannya ditentukan server lewat `/queue/me` (kontrak §3.3): customer yang sudah menekan Bayar (`HELD`,
   * `AWAITING_PAYMENT`) kembali ke Payment dengan tenggat pembayarannya, bukan ke Detail Ticket. Bila server tidak
   * dihubungi (galat jaringan), grant tersimpan dipakai apa adanya; booking sendiri yang menolak grant yang sudah habis.
   * `QUEUED` berarti grant sudah tidak berlaku (dibuang, lanjut sebagai antrian); 401 membuang token dan join ulang.
   */
  async function join(eventId: string): Promise<QueueState> {
    const heldGrant = credentialStore.grantToken(eventId);
    if (!heldGrant) return joinServer(eventId);
    const cached = queueTicketCache.get(eventId);
    const eventName = cached?.eventName ?? "";
    let me;
    try {
      me = await identityClient.get(identityPath(`${queuePath(eventId)}/me`), queueMeSchema, {
        headers: queueHeaders(eventId),
        errorCodes: { 401: "QUEUE_TOKEN_INVALID" },
      });
    } catch (error) {
      const failure = toAppError(error);
      if (failure.kind === "api" && failure.code === "QUEUE_TOKEN_INVALID") {
        // Token antrian ditolak: grant tersimpan ikut tidak berlaku. Masuk antrian ulang dari awal.
        forget(eventId);
        credentialStore.clearGrantToken();
        return joinServer(eventId);
      }
      // Grant tersimpan hanya dipakai bila server tidak terjangkau (jaringan putus, atau 502 dari route same-origin
      // saat backend tidak terjangkau); galat lain tidak boleh menyembunyikan masalahnya.
      const unreachable =
        failure.kind === "network" || (failure.kind === "unknown" && failure.status === 502);
      if (unreachable) return { status: "admitted", eventName, accessToken: heldGrant };
      throw error;
    }
    if (me.state === "QUEUED") {
      // Customer kembali mengantre (grant lama sudah dilepas server): grant tersimpan tidak berlaku lagi.
      credentialStore.clearGrantToken();
      if (!cached) return joinServer(eventId);
      const ticket = { ...cached, ticketNo: me.ticket_no };
      queueTicketCache.set(eventId, ticket);
      return toQueueState(ticket, me);
    }
    return toQueueState(cached ?? { ticketNo: 0, joinedPosition: 0, eventName, ratePerMin: 0 }, me);
  }

  return {
    join,
    getOwnState,
    getState,

    leave(eventId: string): void {
      forget(eventId);
    },

    getEvent(eventId: string): Promise<QueueEvent> {
      return httpClient.get(`/events/${encodeURIComponent(eventId)}`, queueEventSchema);
    },
  };
}
