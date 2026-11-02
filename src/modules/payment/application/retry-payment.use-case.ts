/**
 * Retry Payment Use Case - API Contracts v2.1
 *
 * Requirements: 6.19 (retry/switch payment method)
 * Flow: retryPayment() cancels pending → returns to PENDING_PAYMENT → initiatePayment() with new method
 */

import type { Order } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

export type RetryPaymentUseCase = (bookingId: string) => Promise<Order>;

/**
 * Cancel current pending payment and return booking to PENDING_PAYMENT state.
 * After this, customer can call initiatePayment with a different method.
 * Requirements: 6.19 — TTL_Pembayaran tetap dihitung dari waktu booking awal (tidak di-reset).
 */
export function createRetryPaymentUseCase({
  orderService,
}: {
  orderService: OrderProtocol;
}): RetryPaymentUseCase {
  return (bookingId) => orderService.retryPayment(bookingId);
}
