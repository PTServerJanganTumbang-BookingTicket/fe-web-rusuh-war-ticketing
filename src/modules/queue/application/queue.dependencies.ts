import type { GetQueueEventUseCase } from "./get-queue-event.use-case";
import type { GetQueueStateUseCase } from "./get-queue-state.use-case";
import type { LeaveQueueUseCase } from "./leave-queue.use-case";
import type { WatchQueueStateUseCase } from "./watch-queue-state.use-case";

export type QueueDependencies = {
  getQueueStateUseCase: GetQueueStateUseCase;
  getQueueEventUseCase: GetQueueEventUseCase;
  watchQueueStateUseCase: WatchQueueStateUseCase;
  leaveQueueUseCase: LeaveQueueUseCase;
};
