import type { HttpClient } from "@/core/data/http/http.client";
import type { EventProtocol } from "../domain/event.protocol";
import type { Event } from "../domain/event.model";
import { eventListSchema, eventDetailSchema } from "./event.schema";

export function createHttpEventService({ httpClient }: { httpClient: HttpClient }): EventProtocol {
  return {
    getEvents(): Promise<Event[]> {
      return httpClient.get("/events", eventListSchema);
    },
    getEvent(eventId: string): Promise<Event> {
      return httpClient.get(`/events/${encodeURIComponent(eventId)}`, eventDetailSchema);
    },
  };
}
