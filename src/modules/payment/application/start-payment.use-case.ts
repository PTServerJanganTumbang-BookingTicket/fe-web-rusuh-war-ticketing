/**
 * Start Payment Use Case - API Contracts v2.1
 *
 * Requirements: 6.3 (initiate payment), 6.11 (bank selection for VA)
 */

import type { BankCode, Order, PaymentMethod } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

export type StartPaymentParams = {
  bookingId: string;
  method: PaymentMethod;
  bank?: BankCode; // Required for bank_transfer
};

export type StartPaymentUseCase = (params: StartPaymentParams) => Promise<Order>;

/** Memilih metode bayar. Midtrans dipanggil BE, bukan FE (ADR-0006). */
export function createStartPaymentUseCase({
  orderService,
}: {
  orderService: OrderProtocol;
}): StartPaymentUseCase {
  return ({ bookingId, method, bank }) => orderService.initiatePayment(bookingId, method, bank);
}
