import type { HttpClient } from "@/core/data/http/http.client";
import type { PaymentSimulatorProtocol } from "../domain/payment-simulator.protocol";
import type { Order, PaymentOutcome } from "../domain/order.model";
import { orderSchema } from "./order.schema";

/** Endpoint ini hanya ada di MSW (`/mock/...`). */
export class HttpPaymentSimulatorService implements PaymentSimulatorProtocol {
  private readonly httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }

  simulate(orderId: string, outcome: PaymentOutcome): Promise<Order> {
    return this.httpClient.post(
      `/mock/orders/${encodeURIComponent(orderId)}/outcome`,
      { outcome },
      orderSchema,
    );
  }
}
