import type { HttpClient } from "@/platform/http/HttpClient";
import type { QueueRepository } from "../application/QueueRepository";
import type { QueueState } from "../domain/queueState";
import { queueResponse } from "./queueResponse";

export class HttpQueueRepository implements QueueRepository {
  private readonly httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }

  getState(eventId: string): Promise<QueueState> {
    return this.httpClient.get(`/events/${encodeURIComponent(eventId)}/queue`, queueResponse);
  }
}
