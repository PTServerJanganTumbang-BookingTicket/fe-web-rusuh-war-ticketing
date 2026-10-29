import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { QueueState } from "../domain/queue-state.model";
import type { QueueUpdatesProtocol } from "../domain/queue-updates.protocol";

/** Berlangganan posisi antrian. Requirement: FR-06–10, NFR-05. */
export class WatchQueueStateUseCase {
  private readonly queueUpdatesService: QueueUpdatesProtocol;

  constructor({ queueUpdatesService }: { queueUpdatesService: QueueUpdatesProtocol }) {
    this.queueUpdatesService = queueUpdatesService;
  }

  execute(eventId: string, observer: Observer<QueueState>): Unsubscribe {
    return this.queueUpdatesService.watch(eventId, observer);
  }
}
