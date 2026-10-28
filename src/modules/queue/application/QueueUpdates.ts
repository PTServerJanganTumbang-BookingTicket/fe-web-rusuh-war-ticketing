import type { Observer, Unsubscribe } from "@/core/application/LiveUpdates";
import type { QueueState } from "../domain/queueState";

/** Port pembaruan posisi antrian yang didorong server (SSE, ADR-0016). */
export interface QueueUpdates {
  watch(eventId: string, observer: Observer<QueueState>): Unsubscribe;
}
