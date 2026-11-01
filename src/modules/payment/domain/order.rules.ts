import type { Order } from "./order.model";

/** Status akhir order; stream ditutup dan polling berhenti. */
export function isFinalOrder(order: Order): boolean {
  return order.status === "paid" || order.status === "failed" || order.status === "expired";
}
