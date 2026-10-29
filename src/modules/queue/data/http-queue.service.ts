import type { HttpClient } from "@/core/data/http/http.client";
import type { QueueProtocol } from "../domain/queue.protocol";
import type { QueueState } from "../domain/queue-state.model";
import { queueStateSchema } from "./queue-state.schema";

export class HttpQueueService implements QueueProtocol {
  private readonly httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }

  getState(eventId: string): Promise<QueueState> {
    return this.httpClient.get(`/events/${encodeURIComponent(eventId)}/queue`, queueStateSchema);
  }
}
