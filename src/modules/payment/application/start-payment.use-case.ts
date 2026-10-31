import type { Order, PaymentMethod } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

export type StartPaymentUseCase = (orderId: string, method: PaymentMethod) => Promise<Order>;

/** Memilih metode bayar. Midtrans dipanggil BE, bukan FE (ADR-0006). */
export function createStartPaymentUseCase({
  orderService,
}: {
  orderService: OrderProtocol;
}): StartPaymentUseCase {
  return (orderId, method) => orderService.initiatePayment(orderId, method);
}
