import type { Order, PaymentMethod } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

/** Memilih metode bayar. Midtrans dipanggil BE, bukan FE (ADR-0006). */
export class StartPaymentUseCase {
  private readonly orderService: OrderProtocol;

  constructor({ orderService }: { orderService: OrderProtocol }) {
    this.orderService = orderService;
  }

  execute(orderId: string, method: PaymentMethod): Promise<Order> {
    return this.orderService.initiatePayment(orderId, method);
  }
}
