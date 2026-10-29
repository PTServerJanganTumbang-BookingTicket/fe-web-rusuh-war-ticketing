import { asClass, type NameAndRegistrationPair } from "awilix";
import { GetQueueStateUseCase } from "./application/get-queue-state.use-case";
import type { QueueProtocol } from "./domain/queue.protocol";
import type { QueueUpdatesProtocol } from "./domain/queue-updates.protocol";
import { WatchQueueStateUseCase } from "./application/watch-queue-state.use-case";
import type { QueueDependencies } from "./application/queue.dependencies";
import { HttpQueueService } from "./data/http-queue.service";
import { SseQueueUpdatesService } from "./data/sse-queue-updates.service";

export type QueueRegistry = QueueDependencies & {
  queueService: QueueProtocol;
  queueUpdatesService: QueueUpdatesProtocol;
};

export function queueModule(): NameAndRegistrationPair<QueueRegistry> {
  return {
    queueService: asClass(HttpQueueService).singleton(),
    queueUpdatesService: asClass(SseQueueUpdatesService).singleton(),
    getQueueStateUseCase: asClass(GetQueueStateUseCase).singleton(),
    watchQueueStateUseCase: asClass(WatchQueueStateUseCase).singleton(),
  };
}
