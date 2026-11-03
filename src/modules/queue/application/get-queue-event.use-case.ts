import type { QueueEvent } from "../domain/queue-event.model";
import type { QueueProtocol } from "../domain/queue.protocol";

export type GetQueueEventUseCase = (eventId: string) => Promise<QueueEvent>;

/** Detail event untuk kartu di Waiting Room. Requirement: FR-06. */
export function createGetQueueEventUseCase({
  queueService,
}: {
  queueService: QueueProtocol;
}): GetQueueEventUseCase {
  return (eventId) => queueService.getEvent(eventId);
}
