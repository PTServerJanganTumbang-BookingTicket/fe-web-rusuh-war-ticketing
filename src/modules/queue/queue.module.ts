import { asFunction, type NameAndRegistrationPair } from "awilix";
import { createGetQueueStateUseCase } from "./application/get-queue-state.use-case";
import type { QueueProtocol } from "./domain/queue.protocol";
import type { QueueUpdatesProtocol } from "./domain/queue-updates.protocol";
import { createWatchQueueStateUseCase } from "./application/watch-queue-state.use-case";
import type { QueueDependencies } from "./application/queue.dependencies";
import { createHttpQueueService } from "./data/http-queue.service";
import { createMemoryQueueTicketService, type QueueTicketCache } from "./data/memory-queue-ticket.service";
import { createSseQueueUpdatesService } from "./data/sse-queue-updates.service";

export type QueueRegistry = QueueDependencies & {
  queueService: QueueProtocol;
  queueUpdatesService: QueueUpdatesProtocol;
  queueTicketCache: QueueTicketCache;
};

export function queueModule(): NameAndRegistrationPair<QueueRegistry> {
  return {
    queueTicketCache: asFunction(createMemoryQueueTicketService).singleton(),
    queueService: asFunction(createHttpQueueService).singleton(),
    queueUpdatesService: asFunction(createSseQueueUpdatesService).singleton(),
    getQueueStateUseCase: asFunction(createGetQueueStateUseCase).singleton(),
    watchQueueStateUseCase: asFunction(createWatchQueueStateUseCase).singleton(),
  };
}
