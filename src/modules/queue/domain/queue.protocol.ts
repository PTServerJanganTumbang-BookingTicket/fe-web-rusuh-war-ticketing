import type { QueueState } from "./queue-state.model";

export interface QueueProtocol {
  getState(eventId: string): Promise<QueueState>;
}
