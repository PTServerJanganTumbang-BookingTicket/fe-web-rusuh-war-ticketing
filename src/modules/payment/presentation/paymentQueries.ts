import { queryOptions } from "@tanstack/react-query";
import type { RandomSource } from "@/core/application/RandomSource";
import { withJitter } from "@/core/domain/time/jitter";
import type { GetOrder } from "../application/GetOrder";
import type { Order } from "../domain/order";

export const orderKeys = {
  detail: (orderId: string) => ["order", "detail", orderId] as const,
};

const PAYMENT_POLL_MS = 3000;

/** Status akhir order; stream ditutup dan polling berhenti. */
export function isFinalOrder(order: Order): boolean {
  return order.status === "paid" || order.status === "failed" || order.status === "expired";
}

/**
 * Snapshot awal lewat GET. Perubahan status datang dari SSE (ADR-0016); polling dengan jitter hanya cadangan
 * selama stream tidak tersambung dan order masih pending.
 */
export function orderQuery(
  deps: { getOrder: GetOrder; random: RandomSource },
  orderId: string,
  live = false,
) {
  return queryOptions({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => deps.getOrder.execute(orderId),
    refetchInterval: (query) =>
      !live && query.state.data?.status === "pending"
        ? withJitter(PAYMENT_POLL_MS, deps.random.next())
        : false,
  });
}
