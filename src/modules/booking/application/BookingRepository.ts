import type { BookingSession } from "../domain/bookingSession";

export interface BookingRepository {
  getSession(eventId: string): Promise<BookingSession>;
}
