import type { Order } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

export class GetOrderUseCase {
  private readonly orderService: OrderProtocol;

  constructor({ orderService }: { orderService: OrderProtocol }) {
    this.orderService = orderService;
  }

  execute(orderId: string): Promise<Order> {
    return this.orderService.get(orderId);
  }
}
