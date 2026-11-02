import { queryOptions } from "@tanstack/react-query";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { GetOrderUseCase } from "../application/get-order.use-case";
import { isFinalOrder } from "../domain/order.rules";
import { PAYMENT_STATUS_POLL_INTERVAL_MS } from "../domain/payment.constants";

export const orderKeys = {
  detail: (orderId: string) => ["order", "detail", orderId] as const,
};

/**
 * Snapshot awal lewat GET. Polling dengan jitter selama order masih aktif (belum terminal).
 * SSE dihapus dari modul payment — payment status hanya lewat polling (ADR-0016).
 */
export function orderQuery(
  deps: { getOrderUseCase: GetOrderUseCase; random: RandomProtocol },
  orderId: string,
  live = false,
) {
  return queryOptions({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => deps.getOrderUseCase(orderId),
    refetchInterval: (query) =>
      !live && query.state.data && !isFinalOrder(query.state.data)
        ? withJitter(PAYMENT_STATUS_POLL_INTERVAL_MS, deps.random.next())
        : false,
  });
}
