import type { BookingEvent } from "./booking-event.model";
import type { CreatedBooking, NikCheck, SubmitBookingInput } from "./booking-request.model";
import type { BookingSession } from "./booking-session.model";

export interface BookingProtocol {
  getSession(eventId: string): Promise<BookingSession>;
  getEvent(eventId: string): Promise<BookingEvent>;
  validateNik(nik: string): Promise<NikCheck>;
  /** Hold atomik: semua tiket atau tidak sama sekali (kontrak `POST /bookings`). */
  submitBooking(input: SubmitBookingInput): Promise<CreatedBooking>;
}
