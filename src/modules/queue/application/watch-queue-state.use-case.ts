import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { QueueState } from "../domain/queue-state.model";
import type { QueueUpdatesProtocol } from "../domain/queue-updates.protocol";

export type WatchQueueStateUseCase = (eventId: string, observer: Observer<QueueState>) => Unsubscribe;

/** Berlangganan posisi antrian. Requirement: FR-06–10, NFR-05. */
export function createWatchQueueStateUseCase({
  queueUpdatesService,
}: {
  queueUpdatesService: QueueUpdatesProtocol;
}): WatchQueueStateUseCase {
  return (eventId, observer) => queueUpdatesService.watch(eventId, observer);
}
