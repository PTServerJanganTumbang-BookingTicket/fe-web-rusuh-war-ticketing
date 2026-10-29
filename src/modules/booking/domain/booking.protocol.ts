import type { BookingSession } from "./booking-session.model";

export interface BookingProtocol {
  getSession(eventId: string): Promise<BookingSession>;
}
