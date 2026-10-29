import type { QueueState } from "../domain/queue-state.model";
import type { QueueProtocol } from "../domain/queue.protocol";

/** Posisi antrian atau tiket masuk. Requirement: FR-06–10. */
export class GetQueueStateUseCase {
  private readonly queueService: QueueProtocol;

  constructor({ queueService }: { queueService: QueueProtocol }) {
    this.queueService = queueService;
  }

  execute(eventId: string): Promise<QueueState> {
    return this.queueService.getState(eventId);
  }
}
