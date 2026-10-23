import type { Order, PaymentMethod } from "../domain/payment";
import { canStartPayment } from "../payment/orderStatus";
import type { StartPayment } from "./ports";

export type PayOrderDeps = { startPayment: StartPayment };

/**
 * Memulai pembayaran untuk metode terpilih (FR-20–25, ADR-0006).
 * Order yang bukan `awaiting_method` dikembalikan apa adanya tanpa memanggil BE: pembayaran tidak dimulai ulang,
 * dan keputusan akhir (termasuk expired) tetap milik server (ADR-0005).
 */
export async function payOrder(deps: PayOrderDeps, order: Order, method: PaymentMethod): Promise<Order> {
  if (!canStartPayment(order)) return order;
  return deps.startPayment(order.orderId, method);
}
