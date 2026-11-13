import type { QueueState } from "../domain/queue-state.model";
import type { QueueProtocol } from "../domain/queue.protocol";

export type GetQueueStateUseCase = (
  eventId: string,
  options?: { turnArrived?: boolean },
) => Promise<QueueState>;

/**
 * Polling cadangan lewat `/queue/serving` saat stream SSE tidak tersedia (ADR-0016). Giliran sudah tiba: hanya
 * `/queue/me` yang tahu grant-nya, jadi `/queue/serving` dilewati. Requirement: FR-06–10.
 */
export function createGetQueueStateUseCase({
  queueService,
}: {
  queueService: QueueProtocol;
}): GetQueueStateUseCase {
  return (eventId, options) =>
    options?.turnArrived ? queueService.getOwnState(eventId) : queueService.getState(eventId);
}
