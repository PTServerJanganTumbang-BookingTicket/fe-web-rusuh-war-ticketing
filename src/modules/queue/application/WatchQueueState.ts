import type { Observer, Unsubscribe } from "@/core/application/LiveUpdates";
import type { QueueState } from "../domain/queueState";
import type { QueueUpdates } from "./QueueUpdates";

/** Berlangganan posisi antrian. Requirement: FR-06–10, NFR-05. */
export class WatchQueueState {
  private readonly queueUpdates: QueueUpdates;

  constructor({ queueUpdates }: { queueUpdates: QueueUpdates }) {
    this.queueUpdates = queueUpdates;
  }

  execute(eventId: string, observer: Observer<QueueState>): Unsubscribe {
    return this.queueUpdates.watch(eventId, observer);
  }
}
