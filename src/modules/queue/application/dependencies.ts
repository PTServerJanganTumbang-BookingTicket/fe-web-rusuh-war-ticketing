import type { GetQueueState } from "./GetQueueState";
import type { WatchQueueState } from "./WatchQueueState";

export type QueueDependencies = {
  getQueueState: GetQueueState;
  watchQueueState: WatchQueueState;
};
