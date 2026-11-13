import { queueTokenInHeader } from "@/core/data/credentials/account-gateway-mode.utils";
import type { AppConfig } from "@/core/domain/app-config.model";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
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
 * `GET /events/{event_id}/queue/stream` (kontrak §3.2, v2.12). Pesan tanpa nama membawa `nowServing`, `state`, dan
 * `ratePerMin`; posisi dihitung dari tiket hasil join dan laju terbaru disimpan di tiket untuk estimasi (§3.5). Tidak ada event `grant`: saat `nowServing >= ticket_no`, state diambil
 * dari `GET /queue/me`. `stale` hanya meredupkan data (tidak menutup atau menyambung ulang stream), dan
 * `sold-out` menutup stream.
 */
export function createSseQueueUpdatesService({
  eventStreamClient,
  queueService,
  queueTicketCache,
  credentialStore,
  appConfig,
}: {
  appConfig: AppConfig;
  credentialStore: CredentialStoreProtocol;
  eventStreamClient: EventStreamClient;
  queueService: QueueProtocol;
  queueTicketCache: QueueTicketCache;
}): QueueUpdatesProtocol {
  /** Tanpa cookie, token antrian dikirim sebagai header (jalur klien mobile, kontrak §3.2). */
  function streamOptions(eventId: string) {
    if (!queueTokenInHeader(appConfig)) return undefined;
    const token = credentialStore.queueToken(eventId);
    return token
      ? { headers: { "x-queue-token": token, "x-device-id": credentialStore.deviceId() } }
      : undefined;
  }

  return {
    watch(eventId: string, observer: Observer<QueueState>): Unsubscribe {
      let nowServing: number | undefined;
      let fullBooked = false;
      let stale = false;
      let stopped = false;
      let retry: ReturnType<typeof setTimeout> | undefined;

      /** Gagal mengambil grant dianggap stream putus: controller kembali ke polling cadangan `/queue/serving`. */
      const fetchGrant = () => {
        retry = undefined;
        queueService.getOwnState(eventId).then(
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
        // Stream dibuka setelah join, jadi tiket ada; penjaga ini hanya untuk tiket yang dibuang saat keluar antrian.
        if (!ticket || nowServing === undefined) return;
        if (nowServing >= ticket.ticketNo && ticket.ticketNo > 0) {
          if (!retry) fetchGrant();
          return;
        }
        observer.next(waitingState(ticket, nowServing, { fullBooked, stale }));
      };

      /** Laju terbaru disimpan di tiket, jadi polling cadangan memakai laju yang sama saat stream putus. */
      const keepRate = (ratePerMin: number | undefined) => {
        const ticket = queueTicketCache.get(eventId);
        if (!ticket || ratePerMin === undefined || ratePerMin === ticket.ratePerMin) return;
        queueTicketCache.set(eventId, { ...ticket, ratePerMin: Math.max(ratePerMin, 0) });
      };

      const next = (message: QueueStreamMessage) => {
        switch (message.type) {
          case "serving":
            nowServing = message.nowServing;
            keepRate(message.ratePerMin);
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
        queueTicketCache.get(eventId)?.streamUrl ?? `/events/${encodeURIComponent(eventId)}/queue/stream`,
        queueStreamSchemas,
        {
          next,
          connected: () => observer.connected(),
          disconnected: () => observer.disconnected(),
        },
        streamOptions(eventId),
      );
      return () => {
        stopped = true;
        if (retry) clearTimeout(retry);
        close();
      };
    },
  };
}
