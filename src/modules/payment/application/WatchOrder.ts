import type { Observer, Unsubscribe } from "@/core/application/LiveUpdates";
import type { Order } from "../domain/order";
import type { OrderUpdates } from "./OrderUpdates";

/** Berlangganan status order sampai status akhir. Requirement: FR-20–25. */
export class WatchOrder {
  private readonly orderUpdates: OrderUpdates;

  constructor({ orderUpdates }: { orderUpdates: OrderUpdates }) {
    this.orderUpdates = orderUpdates;
  }

  execute(orderId: string, observer: Observer<Order>): Unsubscribe {
    return this.orderUpdates.watch(orderId, observer);
  }
}
