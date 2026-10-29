import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { Order } from "./order.model";

/** Protocol perubahan status order yang didorong server (SSE, ADR-0016). */
export interface OrderUpdatesProtocol {
  watch(orderId: string, observer: Observer<Order>): Unsubscribe;
}
