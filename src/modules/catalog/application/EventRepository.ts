import type { Event } from "../domain/event";

export interface EventRepository {
  list(): Promise<Event[]>;
}
