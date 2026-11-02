import type { Event } from "../domain/event.model";
import type { EventProtocol } from "../domain/event.protocol";

export type ListEventsUseCase = () => Promise<Event[]>;

/** Daftar event untuk Home. Requirement: FR-01–05. */
export function createListEventsUseCase({
  eventService,
}: {
  eventService: EventProtocol;
}): ListEventsUseCase {
  return () => eventService.getEvents();
}
