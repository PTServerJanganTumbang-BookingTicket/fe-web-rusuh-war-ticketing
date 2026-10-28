import { asClass, type NameAndRegistrationPair } from "awilix";
import { GetQueueState } from "./application/GetQueueState";
import type { QueueRepository } from "./application/QueueRepository";
import type { QueueUpdates } from "./application/QueueUpdates";
import { WatchQueueState } from "./application/WatchQueueState";
import type { QueueDependencies } from "./application/dependencies";
import { HttpQueueRepository } from "./infrastructure/HttpQueueRepository";
import { SseQueueUpdates } from "./infrastructure/SseQueueUpdates";

export type QueueCradle = QueueDependencies & {
  queueRepository: QueueRepository;
  queueUpdates: QueueUpdates;
};

export function queueModule(): NameAndRegistrationPair<QueueCradle> {
  return {
    queueRepository: asClass(HttpQueueRepository).singleton(),
    queueUpdates: asClass(SseQueueUpdates).singleton(),
    getQueueState: asClass(GetQueueState).singleton(),
    watchQueueState: asClass(WatchQueueState).singleton(),
  };
}
