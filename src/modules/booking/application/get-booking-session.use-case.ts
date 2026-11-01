import type { BookingSession } from "../domain/booking-session.model";
import type { BookingProtocol } from "../domain/booking.protocol";

export type GetBookingSessionUseCase = (eventId: string) => Promise<BookingSession>;

/** Sesi booking: kuota NIK, kategori, dan batas waktu dari server. Requirement: FR-11–19. */
export function createGetBookingSessionUseCase({
  bookingService,
}: {
  bookingService: BookingProtocol;
}): GetBookingSessionUseCase {
  return (eventId) => bookingService.getSession(eventId);
}
