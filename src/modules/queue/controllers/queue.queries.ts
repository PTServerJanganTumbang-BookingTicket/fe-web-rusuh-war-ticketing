import { pollingStopped } from "@/core/controllers/query-retry.utils";
import { queryOptions } from "@tanstack/react-query";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { GetQueueEventUseCase } from "../application/get-queue-event.use-case";
import type { GetQueueStateUseCase } from "../application/get-queue-state.use-case";
import type { JoinQueueUseCase } from "../application/join-queue.use-case";
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
 * Masuk antrian (`POST /queue/join`) sekali per kunjungan; stream dibuka sesudahnya. `staleTime: Infinity` supaya
 * pemasangan ulang dalam `gcTime` tidak join lagi (nomor antrian dibagikan saat join). Galat bisnis (QUEUE_FULL,
 * SALE_CLOSED, ...) tidak diulang otomatis: kebijakan `retry` bawaan QueryClient (`shouldRetryQuery`).
 */
export function queueJoinQuery(deps: { joinQueueUseCase: JoinQueueUseCase }, eventId: string) {
  return queryOptions({
    queryKey: queueKeys.join(eventId),
    queryFn: () => deps.joinQueueUseCase(eventId),
    staleTime: Infinity,
  });
}

/**
 * Posisi antrian. Tidak mengambil data sendiri: nilai awal dari hasil join (`initial`, query baru aktif setelah itu)
 * dan pembaruan datang dari SSE (ADR-0016). Polling dengan jitter lewat use case cadangan (`/queue/serving`) hanya
 * jalan selama stream tidak tersambung (`live` false), dan berhenti setelah admitted atau ended.
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
    staleTime: Infinity,
    refetchInterval: (query) => {
      const state = query.state.data;
      return !options.live && !pollingStopped(query) && state?.status === "waiting"
        ? withJitter(state.retryAfterMs, deps.random.next())
        : false;
    },
  });
}
