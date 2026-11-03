import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { EventStreamClient } from "@/core/data/sse/event-stream.client";
import type { QueueProtocol } from "../domain/queue.protocol";
import type { QueueUpdatesProtocol } from "../domain/queue-updates.protocol";
import type { QueueState } from "../domain/queue-state.model";
import type { QueueTicketCache } from "./memory-queue-ticket.service";
import { queueStreamSchemas, waitingState, type QueueStreamMessage } from "./queue-state.schema";

/**
 * `GET /events/{event_id}/queue/stream` (kontrak §3.2). Event tanpa nama membawa `nowServing`; posisi dihitung
 * dari tiket hasil join. `grant` tidak membawa token, jadi state diambil ulang dari `GET /queue/me`.
 */
export function createSseQueueUpdatesService({
  eventStreamClient,
  queueService,
  queueTicketCache,
}: {
  eventStreamClient: EventStreamClient;
  queueService: QueueProtocol;
  queueTicketCache: QueueTicketCache;
}): QueueUpdatesProtocol {
  return {
    watch(eventId: string, observer: Observer<QueueState>): Unsubscribe {
      const next = (message: QueueStreamMessage) => {
        const ticket = queueTicketCache.get(eventId);
        if (message.type === "serving") {
          // Sebelum join selesai belum ada tiket; snapshot GET yang mengisi state pertama.
          if (ticket) observer.next(waitingState(ticket, message.nowServing));
          return;
        }
        if (message.type === "closed") {
          observer.next({ status: "ended", eventName: ticket?.eventName ?? "", reason: "closed" });
          return;
        }
        // Gagal mengambil grant dianggap stream putus: controller kembali ke polling `/queue/me`.
        queueService.getState(eventId).then(
          (state) => observer.next(state),
          () => observer.disconnected(),
        );
      };
      return eventStreamClient.open(
        `/events/${encodeURIComponent(eventId)}/queue/stream`,
        queueStreamSchemas,
        {
          next,
          connected: () => observer.connected(),
          disconnected: () => observer.disconnected(),
        },
      );
    },
  };
}
