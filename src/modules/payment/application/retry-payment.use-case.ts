/**
 * @file retry-payment.use-case.ts
 * @description Retry Payment Use Case - API Contracts v2.1
 *
 * Requirements: 6.19 (retry/switch payment method)
 *
 * Flow: retryPayment() cancels pending transaction AND re-initiates
 * with new method in one call.
 */

import type { BankCode, Order, PaymentMethod } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Parameter untuk retry pembayaran */
export type RetryPaymentInput = {
  readonly bookingId: string;
  readonly method: PaymentMethod;
  readonly bank?: BankCode;
};

/** Use case type untuk retry pembayaran */
export type RetryPaymentUseCase = (params: RetryPaymentInput) => Promise<Order>;

type RetryPaymentDependencies = {
  readonly orderService: OrderProtocol;
};

/* ========================================================================== */
/*                              Use Case Factory                              */
/* ========================================================================== */

/**
 * Membuat use case untuk retry pembayaran dengan metode baru.
 *
 * Cancel current pending payment and retry with a new method.
 * Requirements: 6.19 — TTL_Pembayaran tetap dihitung dari waktu booking awal (tidak di-reset).
 *
 * @param deps - Dependencies yang dibutuhkan
 * @returns RetryPaymentUseCase function
 */
export const createRetryPaymentUseCase = ({
  orderService,
}: RetryPaymentDependencies): RetryPaymentUseCase => {
  return ({ bookingId, method, bank }: RetryPaymentInput): Promise<Order> => {
    return orderService.retryPayment(bookingId, method, bank);
  };
};
