import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { EventStreamClient } from "@/core/data/sse/event-stream.client";
import type { OrderUpdatesProtocol } from "../domain/order-updates.protocol";
import type { Order } from "../domain/order.model";
import { orderSchema } from "./order.schema";

/** `GET /orders/{id}/stream`, event `order`. Server mengirim snapshot saat tersambung (ADR-0016). */
export function createSseOrderUpdatesService({
  eventStreamClient,
}: {
  eventStreamClient: EventStreamClient;
}): OrderUpdatesProtocol {
  return {
    watch(orderId: string, observer: Observer<Order>): Unsubscribe {
      return eventStreamClient.open(
        `/orders/${encodeURIComponent(orderId)}/stream`,
        "order",
        orderSchema,
        observer,
      );
    },
  };
}
