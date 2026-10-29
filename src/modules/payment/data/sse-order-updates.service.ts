import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { EventStreamClient } from "@/core/data/sse/event-stream.client";
import type { OrderUpdatesProtocol } from "../domain/order-updates.protocol";
import type { Order } from "../domain/order.model";
import { orderSchema } from "./order.schema";

/** `GET /orders/{id}/stream`, event `order`. Server mengirim snapshot saat tersambung (ADR-0016). */
export class SseOrderUpdatesService implements OrderUpdatesProtocol {
  private readonly eventStreamClient: EventStreamClient;

  constructor({ eventStreamClient }: { eventStreamClient: EventStreamClient }) {
    this.eventStreamClient = eventStreamClient;
  }

  watch(orderId: string, observer: Observer<Order>): Unsubscribe {
    return this.eventStreamClient.open(
      `/orders/${encodeURIComponent(orderId)}/stream`,
      "order",
      orderSchema,
      observer,
    );
  }
}
