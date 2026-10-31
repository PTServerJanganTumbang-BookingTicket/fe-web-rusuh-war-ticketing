import type { HttpClient } from "@/core/data/http/http.client";
import type { EventProtocol } from "../domain/event.protocol";
import type { Event } from "../domain/event.model";
import { eventListSchema } from "./event.schema";

export function createHttpEventService({ httpClient }: { httpClient: HttpClient }): EventProtocol {
  return {
    async list(): Promise<Event[]> {
      const { events } = await httpClient.get("/events", eventListSchema);
      return events;
    },
  };
}
