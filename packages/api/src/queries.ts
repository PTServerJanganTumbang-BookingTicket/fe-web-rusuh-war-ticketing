import { queryOptions } from "@tanstack/react-query";
import { withJitter } from "@rusuh/core";
import { getBookingSession } from "./adapters/booking";
import { getOrder } from "./adapters/payment";
import { getQueueState } from "./adapters/queue";
import { queryKeys } from "./queryKeys";

/** Polling mengikuti retryAfter server dengan jitter (ADR-0004); berhenti setelah admitted. */
export function queuePositionQuery(eventId: string) {
  return queryOptions({
    queryKey: queryKeys.queue.position(eventId),
    queryFn: () => getQueueState(eventId),
    refetchInterval: (query) => {
      const state = query.state.data;
      return state?.status === "waiting" ? withJitter(state.retryAfterMs, Math.random()) : false;
    },
  });
}

const STOCK_REFRESH_MS = 15_000;

/** Stok disegarkan berkala dengan jitter (ADR-0004). Saat TTL habis server menjawab ACCESS_EXPIRED. */
export function bookingSessionQuery(eventId: string) {
  return queryOptions({
    queryKey: queryKeys.booking.session(eventId),
    queryFn: () => getBookingSession(eventId),
    refetchInterval: () => withJitter(STOCK_REFRESH_MS, Math.random()),
  });
}

const PAYMENT_POLL_MS = 3000;

/** Status order dipantau dengan jitter selama pending (ADR-0004); berhenti di status akhir. */
export function orderQuery(orderId: string) {
  return queryOptions({
    queryKey: queryKeys.order.detail(orderId),
    queryFn: () => getOrder(orderId),
    refetchInterval: (query) => (query.state.data?.status === "pending" ? withJitter(PAYMENT_POLL_MS, Math.random()) : false),
  });
}

