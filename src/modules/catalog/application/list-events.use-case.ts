import type { Event } from "../domain/event.model";
import type { EventProtocol } from "../domain/event.protocol";

/** Daftar event untuk Home. Requirement: FR-01–05. */
export class ListEventsUseCase {
  private readonly eventService: EventProtocol;

  constructor({ eventService }: { eventService: EventProtocol }) {
    this.eventService = eventService;
  }

  execute(): Promise<Event[]> {
    return this.eventService.list();
  }
}
