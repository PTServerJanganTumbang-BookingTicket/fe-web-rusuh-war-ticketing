import type { HttpClient } from "@/core/data/http/http.client";
import type { CaptchaProtocol } from "@/core/domain/captcha.protocol";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { QueueProtocol } from "../domain/queue.protocol";
import type { QueueEvent } from "../domain/queue-event.model";
import type { QueueState } from "../domain/queue-state.model";
import type { QueueTicketCache } from "./memory-queue-ticket.service";
import {
  queueEventSchema,
  queueJoinEventSchema,
  queueJoinSchema,
  queueMeSchema,
  queueServingSchema,
  toQueueState,
  type QueueTicket,
} from "./queue-state.schema";

const queuePath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/queue`;

/**
 * Snapshot antrian: join sekali per event (server menyetel cookie `queue_token`), lalu `GET /queue/me`.
 * Tamu wajib mengirim `X-Device-Id` saat join supaya grant-nya bisa diikat ke perangkat (kontrak).
 */
export function createHttpQueueService({
  httpClient,
  credentialStore,
  queueTicketCache,
  captcha,
}: {
  httpClient: HttpClient;
  credentialStore: CredentialStoreProtocol;
  queueTicketCache: QueueTicketCache;
  captcha: CaptchaProtocol;
}): QueueProtocol {
  /** Laju antrian untuk estimasi; gagal mengambilnya hanya berarti estimasi belum bisa dihitung. */
  async function ratePerMin(eventId: string): Promise<number> {
    try {
      const serving = await httpClient.get(`${queuePath(eventId)}/serving`, queueServingSchema);
      return Math.max(serving.rate_per_min, 0);
    } catch {
      return 0;
    }
  }

  /**
   * Laju 0 adalah keadaan awal antrian (belum ada booking yang diproses). Selama itu laju diambil lagi tiap snapshot,
   * supaya polling cadangan tidak terpaku di "menghitung" saat stream tidak tersambung.
   */
  async function withKnownRate(eventId: string, ticket: QueueTicket): Promise<QueueTicket> {
    if (ticket.ratePerMin > 0) return ticket;
    const rate = await ratePerMin(eventId);
    if (rate <= 0) return ticket;
    const updated = { ...ticket, ratePerMin: rate };
    queueTicketCache.set(eventId, updated);
    return updated;
  }

  async function ticketFor(eventId: string): Promise<QueueTicket> {
    const cached = queueTicketCache.get(eventId);
    if (cached) return withKnownRate(eventId, cached);
    // Token CAPTCHA diambil lebih dulu: join menolak tanpa token (400), dan nomor antrian dibagikan saat join.
    const event = await httpClient.get(`/events/${encodeURIComponent(eventId)}`, queueJoinEventSchema);
    const captchaToken = await captcha.solve(event.captcha);
    const join = await httpClient.post(
      `${queuePath(eventId)}/join`,
      { captcha_token: captchaToken },
      queueJoinSchema,
      {
        headers: { "x-device-id": credentialStore.deviceId() },
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
    const ticket: QueueTicket = {
      ...join,
      eventName: event.name,
      ratePerMin: await ratePerMin(eventId),
    };
    queueTicketCache.set(eventId, ticket);
    return ticket;
  }

  return {
    async getState(eventId: string): Promise<QueueState> {
      const ticket = await ticketFor(eventId);
      const me = await httpClient.get(`${queuePath(eventId)}/me`, queueMeSchema, {
        errorCodes: { 401: "QUEUE_TOKEN_INVALID" },
      });
      return toQueueState(ticket, me);
    },

    leave(eventId: string): void {
      queueTicketCache.delete(eventId);
    },

    getEvent(eventId: string): Promise<QueueEvent> {
      return httpClient.get(`/events/${encodeURIComponent(eventId)}`, queueEventSchema);
    },
  };
}
