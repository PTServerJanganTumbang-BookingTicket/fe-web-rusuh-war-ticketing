import type { LiveStatus } from "@/core/controllers/live-updates.hook";
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
 * Masuk antrian (`POST /queue/join`) tiap kali Waiting Room dipasang atau tampil lagi (`staleTime: 0`). Hasil `waiting`
 * tidak dipakai ulang tanpa bertanya: QueryClient dipakai seluruh aplikasi dan route disimpan tersembunyi (ADR-0007),
 * jadi cache lama bisa memegang tiket yang di server sudah kedaluwarsa dan stream tidak pernah dibuka untuk tiket
 * yang benar. Join ulang idempotent (server menjawab `rejoined`, kontrak §3.1). Cache lama tetap ditampilkan selama
 * ambil ulang berjalan; ambil ulang yang sedang berjalan dipakai bersama, jadi StrictMode yang memasang dua kali
 * tidak membuat dua `POST`. Galat bisnis (QUEUE_FULL, SALE_CLOSED, ...) tidak diulang otomatis: kebijakan `retry`
 * bawaan QueryClient.
 */
export function queueJoinQuery(deps: { joinQueueUseCase: JoinQueueUseCase }, eventId: string) {
  return queryOptions({
    queryKey: queueKeys.join(eventId),
    queryFn: () => deps.joinQueueUseCase(eventId),
    staleTime: 0,
    // Sambung ulang jaringan tidak boleh mengulang `POST /queue/join` beserta CAPTCHA.
    refetchOnReconnect: false,
  });
}

/**
 * Posisi antrian. Tidak mengambil data sendiri: nilai awal dari hasil join (`initial`, query baru aktif setelah itu)
 * dan pembaruan datang dari SSE (ADR-0016). Seperti join, hanya posisi `waiting` yang dipakai ulang tanpa bertanya;
 * hasil lain diverifikasi ke server saat layar dipasang lagi. Polling dengan jitter lewat use case cadangan
 * (`/queue/serving`) hanya jalan saat stream `down` (gagal, putus, atau tidak tersambung dalam batas tunggu);
 * selama `connecting` atau `live` tidak ada polling. Giliran sudah tiba (posisi ≤ 0) tetapi server masih menjawab
 * `waiting`: hanya `/queue/me` yang ditanya (tanpa `/queue/serving`), tiap `QUEUE_TURN_ARRIVED_POLL_MS`, juga saat
 * stream tersambung tetapi diam. Berhenti setelah admitted, ended, atau error.
 */
export function queuePositionQuery(
  deps: { getQueueStateUseCase: GetQueueStateUseCase; random: RandomProtocol },
  eventId: string,
  options: { stream: LiveStatus; initial?: QueueState },
) {
  const key = queueKeys.position(eventId);
  return queryOptions({
    queryKey: key,
    queryFn: ({ client }) => {
      const cached = client.getQueryData<QueueState>(key);
      const turnArrived = cached?.status === "waiting" && cached.position <= 0;
      return deps.getQueueStateUseCase(eventId, { turnArrived });
    },
    enabled: options.initial !== undefined,
    initialData: options.initial,
    staleTime: waitingOnly,
    refetchInterval: (query) => {
      const state = query.state.data;
      if (state?.status !== "waiting" || pollingStopped(query)) return false;
      if (state.position <= 0) return QUEUE_TURN_ARRIVED_POLL_MS;
      if (options.stream !== "down") return false;
      return withJitter(state.retryAfterMs, deps.random.next());
    },
  });
}
