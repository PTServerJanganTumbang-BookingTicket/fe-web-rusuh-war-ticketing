import { pollingStopped } from "@/core/controllers/query-retry.utils";
import { queryOptions } from "@tanstack/react-query";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { GetQueueEventUseCase } from "../application/get-queue-event.use-case";
import type { GetQueueStateUseCase } from "../application/get-queue-state.use-case";
import type { JoinQueueUseCase } from "../application/join-queue.use-case";
import { QUEUE_TURN_ARRIVED_POLL_MS } from "../domain/queue.constants";
import type { QueueState } from "../domain/queue-state.model";

export const queueKeys = {
  join: (eventId: string) => ["queue", "join", eventId] as const,
  position: (eventId: string) => ["queue", "position", eventId] as const,
  event: (eventId: string) => ["queue", "event", eventId] as const,
};

/** Detail event jarang berubah selama antre; dimuat sekali tanpa polling. */
export function queueEventQuery(deps: { getQueueEventUseCase: GetQueueEventUseCase }, eventId: string) {
  return queryOptions({
    queryKey: queueKeys.event(eventId),
    queryFn: () => deps.getQueueEventUseCase(eventId),
    staleTime: Infinity,
  });
}

/**
 * Hanya hasil `waiting` yang dipakai ulang tanpa bertanya. Hasil `admitted` / `ended` basi begitu customer pindah
 * layar (QueryClient dipakai seluruh aplikasi dan route disimpan tersembunyi, ADR-0007): kunjungan berikutnya harus
 * mengikuti jawaban server sekarang, bukan grant lama dari cache.
 */
const waitingOnly = (query: { state: { data: QueueState | undefined } }) =>
  query.state.data?.status === "waiting" ? Infinity : 0;

/**
 * Masuk antrian (`POST /queue/join`) sekali per kunjungan; stream dibuka sesudahnya. Hasil `waiting` bertahan di
 * cache (nomor antrian dibagikan saat join, jadi pemasangan ulang tidak join lagi). Hasil lain dianggap basi dan
 * diambil ulang saat layar dipasang lagi: join ulang idempotent (server menjawab `rejoined`, kontrak §3.1). Ambil
 * ulang yang sedang berjalan dipakai bersama, jadi StrictMode yang memasang dua kali tidak membuat dua `POST`.
 * Galat bisnis (QUEUE_FULL, SALE_CLOSED, ...) tidak diulang otomatis: kebijakan `retry` bawaan QueryClient.
 */
export function queueJoinQuery(deps: { joinQueueUseCase: JoinQueueUseCase }, eventId: string) {
  return queryOptions({
    queryKey: queueKeys.join(eventId),
    queryFn: () => deps.joinQueueUseCase(eventId),
    staleTime: waitingOnly,
  });
}

/**
 * Posisi antrian. Tidak mengambil data sendiri: nilai awal dari hasil join (`initial`, query baru aktif setelah itu)
 * dan pembaruan datang dari SSE (ADR-0016). Seperti join, hanya posisi `waiting` yang dipakai ulang tanpa bertanya;
 * hasil lain diverifikasi ke server saat layar dipasang lagi. Polling dengan jitter lewat use case cadangan (`/queue/serving`) hanya jalan selama stream
 * tidak tersambung (`live` false). Giliran sudah tiba (posisi ≤ 0) tetapi server masih menjawab `waiting`: ditanya
 * tiap `QUEUE_TURN_ARRIVED_POLL_MS`, juga saat stream tersambung tetapi diam. Berhenti setelah admitted, ended, atau error.
 */
export function queuePositionQuery(
  deps: { getQueueStateUseCase: GetQueueStateUseCase; random: RandomProtocol },
  eventId: string,
  options: { live: boolean; initial?: QueueState },
) {
  return queryOptions({
    queryKey: queueKeys.position(eventId),
    queryFn: () => deps.getQueueStateUseCase(eventId),
    enabled: options.initial !== undefined,
    initialData: options.initial,
    staleTime: waitingOnly,
    refetchInterval: (query) => {
      const state = query.state.data;
      if (state?.status !== "waiting" || pollingStopped(query)) return false;
      if (state.position <= 0) return QUEUE_TURN_ARRIVED_POLL_MS;
      return options.live ? false : withJitter(state.retryAfterMs, deps.random.next());
    },
  });
}
