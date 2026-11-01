import type { HttpClient } from "@/core/data/http/http.client";
import type { PaymentSimulatorProtocol } from "../domain/payment-simulator.protocol";
import type { Order, PaymentOutcome } from "../domain/order.model";
import { orderSchema } from "./order.schema";

/** Endpoint ini hanya ada di MSW (`/mock/...`). */
export function createHttpPaymentSimulatorService({
  httpClient,
}: {
  httpClient: HttpClient;
}): PaymentSimulatorProtocol {
  return {
    simulate(orderId: string, outcome: PaymentOutcome): Promise<Order> {
      return httpClient.post(`/mock/orders/${encodeURIComponent(orderId)}/outcome`, { outcome }, orderSchema);
    },
  };
}
