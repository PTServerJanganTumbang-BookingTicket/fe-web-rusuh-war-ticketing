import type { Event } from "@rusuh/core";
import { eventsResponse } from "../contracts/events";
import { apiFetch } from "../http/client";
import { toEvent } from "../mappers/events";

export async function listEvents(): Promise<Event[]> {
  const { events } = await apiFetch("/events", eventsResponse);
  return events.map(toEvent);
}
