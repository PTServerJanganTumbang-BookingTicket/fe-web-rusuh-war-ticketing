import type { QueueState } from "../domain/queue-state.model";
import type { QueueProtocol } from "../domain/queue.protocol";

export type GetQueueStateUseCase = (eventId: string) => Promise<QueueState>;

/** Polling cadangan lewat `/queue/serving` saat stream SSE putus (ADR-0016). Requirement: FR-06–10. */
export function createGetQueueStateUseCase({
  queueService,
}: {
  queueService: QueueProtocol;
}): GetQueueStateUseCase {
  return (eventId) => queueService.getState(eventId);
}
