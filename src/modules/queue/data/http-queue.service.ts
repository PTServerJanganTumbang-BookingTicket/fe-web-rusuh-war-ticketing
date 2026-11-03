import type { HttpClient } from "@/core/data/http/http.client";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { QueueProtocol } from "../domain/queue.protocol";
import type { QueueEvent } from "../domain/queue-event.model";
import type { QueueState } from "../domain/queue-state.model";
import type { QueueTicketCache } from "./memory-queue-ticket.service";
import {
  queueEventSchema,
  queueJoinSchema,
  queueMeSchema,
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
}: {
  httpClient: HttpClient;
  credentialStore: CredentialStoreProtocol;
  queueTicketCache: QueueTicketCache;
}): QueueProtocol {
  async function ticketFor(eventId: string): Promise<QueueTicket> {
    const cached = queueTicketCache.get(eventId);
    if (cached) return cached;
    const ticket = await httpClient.post(`${queuePath(eventId)}/join`, {}, queueJoinSchema, {
      headers: { "x-device-id": credentialStore.deviceId() },
      errorCodes: { 503: "QUEUE_FULL" },
    });
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

    getEvent(eventId: string): Promise<QueueEvent> {
      return httpClient.get(`/events/${encodeURIComponent(eventId)}`, queueEventSchema);
    },
  };
}
