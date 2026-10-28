import type { Order } from "../domain/order";
import type { OrderRepository } from "./OrderRepository";

export class GetOrder {
  private readonly orderRepository: OrderRepository;

  constructor({ orderRepository }: { orderRepository: OrderRepository }) {
    this.orderRepository = orderRepository;
  }

  execute(orderId: string): Promise<Order> {
    return this.orderRepository.get(orderId);
  }
}
