import type { Order, OrderStatus } from "../domain/payment";

const ACTIVE: ReadonlySet<OrderStatus> = new Set<OrderStatus>(["awaiting_method", "pending"]);

/** Order masih berjalan: timer tampil dan status dipantau (ADR-0004, ADR-0005). */
export function isPaymentActive(order: Pick<Order, "status">): boolean {
  return ACTIVE.has(order.status);
}

/** Status akhir (paid, failed, expired): layar hasil, tidak ada timer lagi. */
export function isSettled(order: Pick<Order, "status">): boolean {
  return !isPaymentActive(order);
}

/** Pembayaran hanya dimulai dari `awaiting_method`. Setelah itu metode sudah dipilih dan BE yang memegang statusnya. */
export function canStartPayment(order: Pick<Order, "status">): boolean {
  return order.status === "awaiting_method";
}
