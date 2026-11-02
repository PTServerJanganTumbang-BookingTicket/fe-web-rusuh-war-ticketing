/**
 * Retry Payment Use Case - API Contracts v2.1
 *
 * Requirements: 6.19 (retry/switch payment method)
 * Flow: retryPayment() cancels pending transaction AND re-initiates with new method in one call.
 */

import type { BankCode, Order, PaymentMethod } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

export type RetryPaymentInput = {
  bookingId: string;
  method: PaymentMethod;
  bank?: BankCode;
};

export type RetryPaymentUseCase = (params: RetryPaymentInput) => Promise<Order>;

/**
 * Cancel current pending payment and retry with a new method.
 * Requirements: 6.19 — TTL_Pembayaran tetap dihitung dari waktu booking awal (tidak di-reset).
 */
export function createRetryPaymentUseCase({
  orderService,
}: {
  orderService: OrderProtocol;
}): RetryPaymentUseCase {
  return ({ bookingId, method, bank }) => orderService.retryPayment(bookingId, method, bank);
}
