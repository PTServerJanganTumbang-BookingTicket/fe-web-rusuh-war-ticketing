import type { Observer, Unsubscribe } from "@/core/application/LiveUpdates";
import type { EventStreamClient } from "@/platform/sse/EventStreamClient";
import type { OrderUpdates } from "../application/OrderUpdates";
import type { Order } from "../domain/order";
import { orderResponse } from "./orderResponse";

/** `GET /orders/{id}/stream`, event `order`. Server mengirim snapshot saat tersambung (ADR-0016). */
export class SseOrderUpdates implements OrderUpdates {
  private readonly eventStreamClient: EventStreamClient;

  constructor({ eventStreamClient }: { eventStreamClient: EventStreamClient }) {
    this.eventStreamClient = eventStreamClient;
  }

  watch(orderId: string, observer: Observer<Order>): Unsubscribe {
    return this.eventStreamClient.open(
      `/orders/${encodeURIComponent(orderId)}/stream`,
      "order",
      orderResponse,
      observer,
    );
  }
}
