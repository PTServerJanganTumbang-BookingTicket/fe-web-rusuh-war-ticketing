import { pollingStopped } from "@/core/controllers/query-retry.utils";
import { queryOptions } from "@tanstack/react-query";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { GetQueueEventUseCase } from "../application/get-queue-event.use-case";
import type { GetQueueStateUseCase } from "../application/get-queue-state.use-case";

export const queueKeys = {
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
 * Snapshot awal lewat GET. Pembaruan datang dari SSE (ADR-0016); polling dengan jitter hanya cadangan
 * selama stream tidak tersambung (`live` false), dan berhenti setelah admitted.
 */
export function queuePositionQuery(
  deps: { getQueueStateUseCase: GetQueueStateUseCase; random: RandomProtocol },
  eventId: string,
  live = false,
) {
  return queryOptions({
    queryKey: queueKeys.position(eventId),
    queryFn: () => deps.getQueueStateUseCase(eventId),
    refetchInterval: (query) => {
      const state = query.state.data;
      return !live && !pollingStopped(query) && state?.status === "waiting"
        ? withJitter(state.retryAfterMs, deps.random.next())
        : false;
    },
  });
}
