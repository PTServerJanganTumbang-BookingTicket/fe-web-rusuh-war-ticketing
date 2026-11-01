import type { Order, PaymentOutcome } from "./order.model";

/**
 * Protocol terpisah dari OrderProtocol (ISP): hanya ada di mode mock, menggantikan notifikasi Midtrans ke BE.
 * Backend asli tidak punya endpoint ini.
 */
export interface PaymentSimulatorProtocol {
  simulate(orderId: string, outcome: PaymentOutcome): Promise<Order>;
}
