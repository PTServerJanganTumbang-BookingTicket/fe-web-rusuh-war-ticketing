/**
 * @file get-payment-event.use-case.ts
 * @description Get Payment Event Use Case
 *
 * Mengambil detail event untuk kartu ringkasan di halaman pembayaran.
 */

import type { PaymentEvent } from "../domain/payment-event.model";
import type { OrderProtocol } from "../domain/order.protocol";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Use case type untuk mengambil detail event */
export type GetPaymentEventUseCase = (eventId: string) => Promise<PaymentEvent>;

type GetPaymentEventDependencies = {
  readonly orderService: OrderProtocol;
};

/* ========================================================================== */
/*                              Use Case Factory                              */
/* ========================================================================== */

/**
 * Membuat use case untuk mengambil detail event.
 *
 * Detail event ditampilkan di kartu samping halaman pembayaran.
 *
 * @param deps - Dependencies yang dibutuhkan
 * @returns GetPaymentEventUseCase function
 */
export const createGetPaymentEventUseCase = ({
  orderService,
}: GetPaymentEventDependencies): GetPaymentEventUseCase => {
  return (eventId: string): Promise<PaymentEvent> => {
    return orderService.getEvent(eventId);
  };
};
