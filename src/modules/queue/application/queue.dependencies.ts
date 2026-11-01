import type { GetQueueStateUseCase } from "./get-queue-state.use-case";
import type { WatchQueueStateUseCase } from "./watch-queue-state.use-case";

export type QueueDependencies = {
  getQueueStateUseCase: GetQueueStateUseCase;
  watchQueueStateUseCase: WatchQueueStateUseCase;
};
