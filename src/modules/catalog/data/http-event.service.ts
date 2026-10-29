import type { HttpClient } from "@/core/data/http/http.client";
import type { EventProtocol } from "../domain/event.protocol";
import type { Event } from "../domain/event.model";
import { eventListSchema } from "./event.schema";

export class HttpEventService implements EventProtocol {
  private readonly httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }

  async list(): Promise<Event[]> {
    const { events } = await this.httpClient.get("/events", eventListSchema);
    return events;
  }
}
