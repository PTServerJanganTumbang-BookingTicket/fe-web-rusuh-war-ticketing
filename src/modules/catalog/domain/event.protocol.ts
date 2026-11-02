import type { Event } from "./event.model";

/**
 * Protocol untuk mengakses data event.
 * Ref: Design doc — catalog/domain/event.protocol.ts
 * Clean Architecture: Dependency inversion interface (domain layer).
 */
export interface EventProtocol {
  /** Mengambil daftar seluruh event. Req 1.1 */
  getEvents(): Promise<Event[]>;
  /** Mengambil detail satu event berdasarkan ID. */
  getEvent(eventId: string): Promise<Event>;
}
