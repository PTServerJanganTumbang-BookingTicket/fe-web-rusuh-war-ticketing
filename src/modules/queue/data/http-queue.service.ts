import type { HttpClient } from "@/core/data/http/http.client";
import type { QueueProtocol } from "../domain/queue.protocol";
import type { QueueState } from "../domain/queue-state.model";
import { queueStateSchema } from "./queue-state.schema";

export function createHttpQueueService({ httpClient }: { httpClient: HttpClient }): QueueProtocol {
  return {
    getState(eventId: string): Promise<QueueState> {
      return httpClient.get(`/events/${encodeURIComponent(eventId)}/queue`, queueStateSchema);
    },
  };
}
