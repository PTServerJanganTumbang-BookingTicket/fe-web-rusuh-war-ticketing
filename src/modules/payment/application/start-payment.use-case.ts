/**
 * @file start-payment.use-case.ts
 * @description Start Payment Use Case - API Contracts v2.1
 *
 * Requirements: 6.3 (initiate payment), 6.11 (bank selection for VA)
 */

import type { BankCode, Order, PaymentMethod } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Parameter untuk memulai pembayaran */
export type StartPaymentParams = {
  readonly bookingId: string;
  readonly method: PaymentMethod;
  /** Wajib untuk bank_transfer */
  readonly bank?: BankCode;
};

/** Use case type untuk memulai pembayaran */
export type StartPaymentUseCase = (params: StartPaymentParams) => Promise<Order>;

type StartPaymentDependencies = {
  readonly orderService: OrderProtocol;
};

/* ========================================================================== */
/*                              Use Case Factory                              */
/* ========================================================================== */

/**
 * Membuat use case untuk memulai pembayaran.
 *
 * Midtrans dipanggil oleh BE, bukan FE (ADR-0006).
 *
 * @param deps - Dependencies yang dibutuhkan
 * @returns StartPaymentUseCase function
 */
export const createStartPaymentUseCase = ({
  orderService,
}: StartPaymentDependencies): StartPaymentUseCase => {
  return ({ bookingId, method, bank }: StartPaymentParams): Promise<Order> => {
    return orderService.initiatePayment(bookingId, method, bank);
  };
};
