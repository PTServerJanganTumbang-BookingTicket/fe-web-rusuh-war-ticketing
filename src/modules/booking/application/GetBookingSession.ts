import type { BookingSession } from "../domain/bookingSession";
import type { BookingRepository } from "./BookingRepository";

/** Sesi booking: kuota NIK, kategori, dan batas waktu dari server. Requirement: FR-11–19. */
export class GetBookingSession {
  private readonly bookingRepository: BookingRepository;

  constructor({ bookingRepository }: { bookingRepository: BookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  execute(eventId: string): Promise<BookingSession> {
    return this.bookingRepository.getSession(eventId);
  }
}
