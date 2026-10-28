import type { Observer, Unsubscribe } from "@/core/application/LiveUpdates";
import type { Order } from "../domain/order";

/** Port perubahan status order yang didorong server (SSE, ADR-0016). */
export interface OrderUpdates {
  watch(orderId: string, observer: Observer<Order>): Unsubscribe;
}
