import type { BookingEvent } from "../domain/booking-event.model";
import type { BookingProtocol } from "../domain/booking.protocol";

export type GetBookingEventUseCase = (eventId: string) => Promise<BookingEvent>;

/** Detail event untuk kartu di Detail Tiket. */
export function createGetBookingEventUseCase({
  bookingService,
}: {
  bookingService: BookingProtocol;
}): GetBookingEventUseCase {
  return (eventId) => bookingService.getEvent(eventId);
}
