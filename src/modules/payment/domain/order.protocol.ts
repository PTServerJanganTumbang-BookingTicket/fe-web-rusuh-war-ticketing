import type { Order, PaymentMethod } from "./order.model";

export interface OrderProtocol {
  get(orderId: string): Promise<Order>;
  initiatePayment(orderId: string, method: PaymentMethod): Promise<Order>;
}
