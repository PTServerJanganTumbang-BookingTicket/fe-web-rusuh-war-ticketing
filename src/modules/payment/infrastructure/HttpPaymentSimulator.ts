import type { HttpClient } from "@/platform/http/HttpClient";
import type { PaymentSimulator } from "../application/PaymentSimulator";
import type { Order, PaymentOutcome } from "../domain/order";
import { orderResponse } from "./orderResponse";

/** Endpoint ini hanya ada di MSW (`/mock/...`). */
export class HttpPaymentSimulator implements PaymentSimulator {
  private readonly httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }

  simulate(orderId: string, outcome: PaymentOutcome): Promise<Order> {
    return this.httpClient.post(
      `/mock/orders/${encodeURIComponent(orderId)}/outcome`,
      { outcome },
      orderResponse,
    );
  }
}
