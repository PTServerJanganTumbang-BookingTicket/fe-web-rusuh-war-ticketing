import type { QueueState } from "../domain/queueState";
import type { QueueRepository } from "./QueueRepository";

/** Posisi antrian atau tiket masuk. Requirement: FR-06–10. */
export class GetQueueState {
  private readonly queueRepository: QueueRepository;

  constructor({ queueRepository }: { queueRepository: QueueRepository }) {
    this.queueRepository = queueRepository;
  }

  execute(eventId: string): Promise<QueueState> {
    return this.queueRepository.getState(eventId);
  }
}
