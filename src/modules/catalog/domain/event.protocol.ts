import type { Event } from "./event.model";

export interface EventProtocol {
  list(): Promise<Event[]>;
}
