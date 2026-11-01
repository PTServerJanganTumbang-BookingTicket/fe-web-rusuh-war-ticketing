import { asFunction, type NameAndRegistrationPair } from "awilix";
import { createGetQueueStateUseCase } from "./application/get-queue-state.use-case";
import type { QueueProtocol } from "./domain/queue.protocol";
import type { QueueUpdatesProtocol } from "./domain/queue-updates.protocol";
import { createWatchQueueStateUseCase } from "./application/watch-queue-state.use-case";
import type { QueueDependencies } from "./application/queue.dependencies";
import { createHttpQueueService } from "./data/http-queue.service";
import { createSseQueueUpdatesService } from "./data/sse-queue-updates.service";

export type QueueRegistry = QueueDependencies & {
  queueService: QueueProtocol;
  queueUpdatesService: QueueUpdatesProtocol;
};

export function queueModule(): NameAndRegistrationPair<QueueRegistry> {
  return {
    queueService: asFunction(createHttpQueueService).singleton(),
    queueUpdatesService: asFunction(createSseQueueUpdatesService).singleton(),
    getQueueStateUseCase: asFunction(createGetQueueStateUseCase).singleton(),
    watchQueueStateUseCase: asFunction(createWatchQueueStateUseCase).singleton(),
  };
}
