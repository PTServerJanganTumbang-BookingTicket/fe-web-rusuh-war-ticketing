/**
 * @file watch-order.use-case.ts
 * @description Watch Order Use Case - API Contracts v2.1 (Polling-based)
 *
 * Requirements: 6.12 (polling status setiap 3 detik), 6.13 (polling sampai terminal)
 *
 * NOTE: SSE removed for payment. Uses polling via getPaymentStatus.
 */

import type { PaymentStatusResult } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Use case type untuk polling status pembayaran */
export type WatchOrderUseCase = (bookingId: string) => Promise<PaymentStatusResult>;

type WatchOrderDependencies = {
  readonly orderService: OrderProtocol;
};

/* ========================================================================== */
/*                              Use Case Factory                              */
/* ========================================================================== */

/**
 * Membuat use case untuk polling status pembayaran.
 *
 * Called via TanStack Query polling.
 * Requirement: 6.12, 6.13 — polling setiap 3 detik sampai status terminal.
 *
 * @param deps - Dependencies yang dibutuhkan
 * @returns WatchOrderUseCase function
 */
export const createWatchOrderUseCase = ({ orderService }: WatchOrderDependencies): WatchOrderUseCase => {
  return (bookingId: string): Promise<PaymentStatusResult> => {
    return orderService.getPaymentStatus(bookingId);
  };
};
