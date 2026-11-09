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
  /** Laju antrian untuk ETA; gagal mengambilnya hanya berarti ETA belum bisa dihitung. */
  async function secondsPerPosition(eventId: string): Promise<number> {
    try {
      const { rate_per_min: rate } = await httpClient.get(
        `${queuePath(eventId)}/serving`,
        queueServingSchema,
      );
      return rate > 0 ? 60 / rate : 0;
    } catch {
      return 0;
    }
  }

  async function ticketFor(eventId: string): Promise<QueueTicket> {
    const cached = queueTicketCache.get(eventId);
    if (cached) return cached;
    // Token CAPTCHA diambil lebih dulu: join menolak tanpa token (400), dan nomor antrian dibagikan saat join.
    const event = await httpClient.get(`/events/${encodeURIComponent(eventId)}`, queueJoinEventSchema);
    const captchaToken = await captcha.solve(event.captcha);
    const join = await httpClient.post(
      `${queuePath(eventId)}/join`,
      { captcha_token: captchaToken },
      queueJoinSchema,
      {
        headers: { "x-device-id": credentialStore.deviceId() },
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
      secondsPerPosition: await secondsPerPosition(eventId),
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
