import { queryOptions } from "@tanstack/react-query";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { GetOrderUseCase } from "../application/get-order.use-case";
import { PAYMENT_STATUS_POLL_INTERVAL_MS } from "../domain/payment.constants";

export const orderKeys = {
  detail: (orderId: string) => ["order", "detail", orderId] as const,
};

/**
 * Snapshot awal lewat GET. Perubahan status datang dari SSE (ADR-0016); polling dengan jitter hanya cadangan
 * selama stream tidak tersambung dan order masih pending.
 */
export function orderQuery(
  deps: { getOrderUseCase: GetOrderUseCase; random: RandomProtocol },
  orderId: string,
  live = false,
) {
  return queryOptions({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => deps.getOrderUseCase.execute(orderId),
    refetchInterval: (query) =>
      !live && query.state.data?.status === "pending"
        ? withJitter(PAYMENT_STATUS_POLL_INTERVAL_MS, deps.random.next())
        : false,
  });
}
