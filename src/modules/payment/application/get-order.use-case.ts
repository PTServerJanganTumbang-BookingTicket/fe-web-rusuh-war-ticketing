/**
 * Get Order Use Case - API Contracts v2.1
 *
 * Requirements: 6.12 (polling status), 6.2 (order summary)
 */

import type { Order } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

export type GetOrderUseCase = (bookingId: string) => Promise<Order>;

export function createGetOrderUseCase({ orderService }: { orderService: OrderProtocol }): GetOrderUseCase {
  return (bookingId) => orderService.getOrder(bookingId);
}
