import type { Order, PaymentOutcome } from "../domain/order";

/**
 * Port terpisah dari OrderRepository (ISP): hanya ada di mode mock, menggantikan notifikasi Midtrans ke BE.
 * Backend asli tidak punya endpoint ini.
 */
export interface PaymentSimulator {
  simulate(orderId: string, outcome: PaymentOutcome): Promise<Order>;
}
