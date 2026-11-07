import { AppFailure } from "@/core/domain/app-error";
import type { CreatedBooking, SubmitBookingInput } from "../domain/booking-request.model";
import type { BookingProtocol } from "../domain/booking.protocol";
import { validateBookingTickets } from "../domain/ticket-holders.rules";

export type SubmitBookingUseCase = (input: SubmitBookingInput) => Promise<CreatedBooking>;

/**
 * Membuat booking dan menahan stok. Requirement: FR-15–19, BR-01, BR-02. Isian yang melanggar aturan pemegang
 * tiket ditolak sebelum request, dengan kode yang sama seperti 400 dari server.
 */
export function createSubmitBookingUseCase({
  bookingService,
}: {
  bookingService: BookingProtocol;
}): SubmitBookingUseCase {
  return (input) => {
    if (validateBookingTickets(input.tickets)) {
      return Promise.reject(new AppFailure({ kind: "api", code: "BOOKING_INVALID", status: 400 }));
    }
    return bookingService.submitBooking({ ...input, contactEmail: input.contactEmail.trim() });
  };
}
