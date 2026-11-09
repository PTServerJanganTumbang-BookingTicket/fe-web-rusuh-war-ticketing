import type { QueueEvent } from "./queue-event.model";
import type { QueueState } from "./queue-state.model";

export interface QueueProtocol {
  getState(eventId: string): Promise<QueueState>;
  getEvent(eventId: string): Promise<QueueEvent>;
  /** Membuang tiket antrian yang tersimpan di perangkat ini (keluar dari antrian). */
  leave(eventId: string): void;
}
