import type { Order } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

export type GetOrderUseCase = (orderId: string) => Promise<Order>;

export function createGetOrderUseCase({ orderService }: { orderService: OrderProtocol }): GetOrderUseCase {
  return (orderId) => orderService.get(orderId);
}
