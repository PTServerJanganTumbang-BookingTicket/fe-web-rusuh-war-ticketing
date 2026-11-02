/**
 * Watch Order Use Case - API Contracts v2.1 (Polling-based)
 *
 * Requirements: 6.12 (polling status setiap 3 detik), 6.13 (polling sampai terminal)
 * NOTE: SSE removed for payment. Uses polling via getPaymentStatus.
 */

import type { PaymentStatusResult } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

export type WatchOrderUseCase = (bookingId: string) => Promise<PaymentStatusResult>;

/**
 * Get current payment status. Called via TanStack Query polling.
 * Requirement: 6.12, 6.13 — polling setiap 3 detik sampai status terminal.
 */
export function createWatchOrderUseCase({
  orderService,
}: {
  orderService: OrderProtocol;
}): WatchOrderUseCase {
  return (bookingId) => orderService.getPaymentStatus(bookingId);
}
