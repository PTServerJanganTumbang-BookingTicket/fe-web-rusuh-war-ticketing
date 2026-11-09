import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { EventStreamClient } from "@/core/data/sse/event-stream.client";
import type { QueueProtocol } from "../domain/queue.protocol";
import type { QueueUpdatesProtocol } from "../domain/queue-updates.protocol";
import type { QueueState } from "../domain/queue-state.model";
import type { QueueTicketCache } from "./memory-queue-ticket.service";
import { queueStreamSchemas, waitingState, type QueueStreamMessage } from "./queue-state.schema";

/** Jeda mengulang `/queue/me` bila baris grant belum terbaca (kontrak §3.2: `QUEUED` dengan posisi 0). */
const GRANT_RETRY_MS = 1_000;

/**
 * `GET /events/{event_id}/queue/stream` (kontrak §3.2, v2.12). Pesan tanpa nama membawa `nowServing` dan `state`;
 * posisi dihitung dari tiket hasil join. Tidak ada event `grant`: saat `nowServing >= ticket_no`, state diambil
 * dari `GET /queue/me`. `stale` hanya meredupkan data (tidak menutup atau menyambung ulang stream), dan
 * `sold-out` menutup stream.
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
      let nowServing: number | undefined;
      let fullBooked = false;
      let stale = false;
      let stopped = false;
      let retry: ReturnType<typeof setTimeout> | undefined;

      /** Gagal mengambil grant dianggap stream putus: controller kembali ke polling `/queue/me`. */
      const fetchGrant = () => {
        retry = undefined;
        queueService.getState(eventId).then(
          (state) => {
            if (stopped) return;
            if (state.status === "waiting") {
              retry = setTimeout(fetchGrant, GRANT_RETRY_MS);
              return;
            }
            observer.next(state);
          },
          () => {
            if (!stopped) observer.disconnected();
          },
        );
      };

      const publish = () => {
        const ticket = queueTicketCache.get(eventId);
        // Sebelum join selesai belum ada tiket; snapshot GET yang mengisi state pertama.
        if (!ticket || nowServing === undefined) return;
        if (nowServing >= ticket.ticketNo && ticket.ticketNo > 0) {
          if (!retry) fetchGrant();
          return;
        }
        observer.next(waitingState(ticket, nowServing, { fullBooked, stale }));
      };

      const next = (message: QueueStreamMessage) => {
        switch (message.type) {
          case "serving":
            nowServing = message.nowServing;
            fullBooked = message.saleState === "FULL_BOOKED";
            stale = false;
            publish();
            return;
          case "status":
            fullBooked = message.saleState === "FULL_BOOKED";
            publish();
            return;
          case "stale":
            stale = message.stale;
            fullBooked = message.saleState === "FULL_BOOKED";
            publish();
            return;
          case "closed":
            observer.next({
              status: "ended",
              eventName: queueTicketCache.get(eventId)?.eventName ?? "",
              reason: "closed",
            });
            return;
          case "reconnect":
            // Server sedang shutdown; EventSource menyambung ulang sendiri, selama itu controller memakai polling.
            observer.disconnected();
            return;
        }
      };

      const close = eventStreamClient.open(
        `/events/${encodeURIComponent(eventId)}/queue/stream`,
        queueStreamSchemas,
        {
          next,
          connected: () => observer.connected(),
          disconnected: () => observer.disconnected(),
        },
      );
      return () => {
        stopped = true;
        if (retry) clearTimeout(retry);
        close();
      };
    },
  };
}
