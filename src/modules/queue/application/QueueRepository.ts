import type { QueueState } from "../domain/queueState";

export interface QueueRepository {
  getState(eventId: string): Promise<QueueState>;
}
