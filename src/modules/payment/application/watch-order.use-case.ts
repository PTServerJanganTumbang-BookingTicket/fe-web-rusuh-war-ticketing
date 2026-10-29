import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { Order } from "../domain/order.model";
import type { OrderUpdatesProtocol } from "../domain/order-updates.protocol";

/** Berlangganan status order sampai status akhir. Requirement: FR-20–25. */
export class WatchOrderUseCase {
  private readonly orderUpdatesService: OrderUpdatesProtocol;

  constructor({ orderUpdatesService }: { orderUpdatesService: OrderUpdatesProtocol }) {
    this.orderUpdatesService = orderUpdatesService;
  }

  execute(orderId: string, observer: Observer<Order>): Unsubscribe {
    return this.orderUpdatesService.watch(orderId, observer);
  }
}
