import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { Order } from "../domain/order.model";
import type { OrderUpdatesProtocol } from "../domain/order-updates.protocol";

export type WatchOrderUseCase = (orderId: string, observer: Observer<Order>) => Unsubscribe;

/** Berlangganan status order sampai status akhir. Requirement: FR-20–25. */
export function createWatchOrderUseCase({
  orderUpdatesService,
}: {
  orderUpdatesService: OrderUpdatesProtocol;
}): WatchOrderUseCase {
  return (orderId, observer) => orderUpdatesService.watch(orderId, observer);
}
