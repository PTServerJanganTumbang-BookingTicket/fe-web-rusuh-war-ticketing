import { queryOptions } from "@tanstack/react-query";
import type { RandomSource } from "@/core/application/RandomSource";
import { withJitter } from "@/core/domain/time/jitter";
import type { GetQueueState } from "../application/GetQueueState";

export const queueKeys = {
  position: (eventId: string) => ["queue", "position", eventId] as const,
};

/**
 * Snapshot awal lewat GET. Pembaruan datang dari SSE (ADR-0016); polling dengan jitter hanya cadangan
 * selama stream tidak tersambung (`live` false), dan berhenti setelah admitted.
 */
export function queuePositionQuery(
  deps: { getQueueState: GetQueueState; random: RandomSource },
  eventId: string,
  live = false,
) {
  return queryOptions({
    queryKey: queueKeys.position(eventId),
    queryFn: () => deps.getQueueState.execute(eventId),
    refetchInterval: (query) => {
      const state = query.state.data;
      return !live && state?.status === "waiting"
        ? withJitter(state.retryAfterMs, deps.random.next())
        : false;
    },
  });
}
