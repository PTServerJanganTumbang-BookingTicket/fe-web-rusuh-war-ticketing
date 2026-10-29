import type { BookingSession } from "../domain/booking-session.model";
import type { BookingProtocol } from "../domain/booking.protocol";

/** Sesi booking: kuota NIK, kategori, dan batas waktu dari server. Requirement: FR-11–19. */
export class GetBookingSessionUseCase {
  private readonly bookingService: BookingProtocol;

  constructor({ bookingService }: { bookingService: BookingProtocol }) {
    this.bookingService = bookingService;
  }

  execute(eventId: string): Promise<BookingSession> {
    return this.bookingService.getSession(eventId);
  }
}
