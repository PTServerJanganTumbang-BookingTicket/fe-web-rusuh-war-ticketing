import type { QueueState } from "../domain/queue-state.model";
import type { QueueProtocol } from "../domain/queue.protocol";

export type JoinQueueUseCase = (eventId: string) => Promise<QueueState>;

/** Masuk antrian event (`POST /queue/join`) sebelum stream dibuka. Requirement: FR-06, kontrak §3.1. */
export function createJoinQueueUseCase({ queueService }: { queueService: QueueProtocol }): JoinQueueUseCase {
  return (eventId) => queueService.join(eventId);
}
