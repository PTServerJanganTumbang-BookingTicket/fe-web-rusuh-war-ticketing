import type { PaymentEvent } from "../domain/payment-event.model";
import type { OrderProtocol } from "../domain/order.protocol";

export type GetPaymentEventUseCase = (eventId: string) => Promise<PaymentEvent>;

/** Detail event untuk kartu di halaman pembayaran. */
export function createGetPaymentEventUseCase({
  orderService,
}: {
  orderService: OrderProtocol;
}): GetPaymentEventUseCase {
  return (eventId) => orderService.getEvent(eventId);
}
