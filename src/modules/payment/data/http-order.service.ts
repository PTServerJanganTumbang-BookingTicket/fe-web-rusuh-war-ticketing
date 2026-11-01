import type { HttpClient } from "@/core/data/http/http.client";
import type { OrderProtocol } from "../domain/order.protocol";
import type { Order, PaymentMethod } from "../domain/order.model";
import { orderSchema } from "./order.schema";

export function createHttpOrderService({ httpClient }: { httpClient: HttpClient }): OrderProtocol {
  return {
    get(orderId: string): Promise<Order> {
      return httpClient.get(`/orders/${encodeURIComponent(orderId)}`, orderSchema);
    },

    initiatePayment(orderId: string, method: PaymentMethod): Promise<Order> {
      return httpClient.post(`/orders/${encodeURIComponent(orderId)}/payment`, { method }, orderSchema);
    },
  };
}
