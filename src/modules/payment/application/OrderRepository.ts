import type { Order, PaymentMethod } from "../domain/order";

export interface OrderRepository {
  get(orderId: string): Promise<Order>;
  startPayment(orderId: string, method: PaymentMethod): Promise<Order>;
}
