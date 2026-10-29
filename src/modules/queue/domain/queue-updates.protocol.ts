import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { QueueState } from "./queue-state.model";

/** Protocol pembaruan posisi antrian yang didorong server (SSE, ADR-0016). */
export interface QueueUpdatesProtocol {
  watch(eventId: string, observer: Observer<QueueState>): Unsubscribe;
}
