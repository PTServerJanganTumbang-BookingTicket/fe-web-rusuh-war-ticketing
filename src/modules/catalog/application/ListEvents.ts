import type { Event } from "../domain/event";
import type { EventRepository } from "./EventRepository";

/** Daftar event untuk Home. Requirement: FR-01–05. */
export class ListEvents {
  private readonly eventRepository: EventRepository;

  constructor({ eventRepository }: { eventRepository: EventRepository }) {
    this.eventRepository = eventRepository;
  }

  execute(): Promise<Event[]> {
    return this.eventRepository.list();
  }
}
