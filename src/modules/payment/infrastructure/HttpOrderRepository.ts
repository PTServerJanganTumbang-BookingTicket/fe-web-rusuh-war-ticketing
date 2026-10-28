import type { HttpClient } from "@/platform/http/HttpClient";
import type { OrderRepository } from "../application/OrderRepository";
import type { Order, PaymentMethod } from "../domain/order";
import { orderResponse } from "./orderResponse";

export class HttpOrderRepository implements OrderRepository {
  private readonly httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }

  get(orderId: string): Promise<Order> {
    return this.httpClient.get(`/orders/${encodeURIComponent(orderId)}`, orderResponse);
  }

  startPayment(orderId: string, method: PaymentMethod): Promise<Order> {
    return this.httpClient.post(`/orders/${encodeURIComponent(orderId)}/payment`, { method }, orderResponse);
  }
}
