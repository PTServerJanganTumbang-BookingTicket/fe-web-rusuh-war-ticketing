/**
 * @file payment.queries.ts
 * @description TanStack Query options untuk payment module.
 * Menangani fetching dan polling status order.
 */

import { queryOptions } from "@tanstack/react-query";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { GetOrderUseCase } from "../application/get-order.use-case";
import { isFinalOrder } from "../domain/order.rules";
import { PAYMENT_STATUS_POLL_INTERVAL_MS } from "../domain/payment.constants";

/* ========================================================================== */
/*                                Query Keys                                  */
/* ========================================================================== */

/** Query keys untuk order-related queries */
export const orderKeys = {
  /** Key untuk detail order berdasarkan orderId */
  detail: (orderId: string) => ["order", "detail", orderId] as const,
} as const;

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

type OrderQueryDependencies = {
  readonly getOrderUseCase: GetOrderUseCase;
  readonly random: RandomProtocol;
};

/* ========================================================================== */
/*                              Query Options                                 */
/* ========================================================================== */

/**
 * Query options untuk fetching dan polling order status.
 *
 * Behavior:
 * - Snapshot awal diambil via GET /bookings/{id}
 * - Polling dengan jitter selama order belum terminal (PAID/FAILED/EXPIRED)
 * - SSE dihapus dari modul payment — status hanya lewat polling (ADR-0016)
 *
 * @param deps - Dependencies yang dibutuhkan (getOrderUseCase, random)
 * @param orderId - ID order yang akan di-fetch
 * @param live - Jika true, polling dimatikan (untuk SSR/prefetch)
 */
export const orderQuery = (deps: OrderQueryDependencies, orderId: string, live: boolean = false) => {
  const { getOrderUseCase, random } = deps;

  return queryOptions({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => getOrderUseCase(orderId),
    refetchInterval: (query) => {
      const orderData = query.state.data;

      // Tidak polling jika live mode atau order belum ada
      if (live || orderData == null) {
        return false;
      }

      // Tidak polling jika order sudah terminal
      if (isFinalOrder(orderData)) {
        return false;
      }

      // Polling dengan jitter untuk menghindari thundering herd
      const jitteredInterval = withJitter(PAYMENT_STATUS_POLL_INTERVAL_MS, random.next());
      return jitteredInterval;
    },
  });
};
