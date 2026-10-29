import type { HttpClient } from "@/core/data/http/http.client";
import type { OrderProtocol } from "../domain/order.protocol";
import type { Order, PaymentMethod } from "../domain/order.model";
import { orderSchema } from "./order.schema";

export class HttpOrderService implements OrderProtocol {
  private readonly httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }

  get(orderId: string): Promise<Order> {
    return this.httpClient.get(`/orders/${encodeURIComponent(orderId)}`, orderSchema);
  }

  initiatePayment(orderId: string, method: PaymentMethod): Promise<Order> {
    return this.httpClient.post(`/orders/${encodeURIComponent(orderId)}/payment`, { method }, orderSchema);
  }
}
