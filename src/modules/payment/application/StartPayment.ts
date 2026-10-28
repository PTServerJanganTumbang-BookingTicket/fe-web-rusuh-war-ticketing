import type { Order, PaymentMethod } from "../domain/order";
import type { OrderRepository } from "./OrderRepository";

/** Memilih metode bayar. Midtrans dipanggil BE, bukan FE (ADR-0006). */
export class StartPayment {
  private readonly orderRepository: OrderRepository;

  constructor({ orderRepository }: { orderRepository: OrderRepository }) {
    this.orderRepository = orderRepository;
  }

  execute(orderId: string, method: PaymentMethod): Promise<Order> {
    return this.orderRepository.startPayment(orderId, method);
  }
}
