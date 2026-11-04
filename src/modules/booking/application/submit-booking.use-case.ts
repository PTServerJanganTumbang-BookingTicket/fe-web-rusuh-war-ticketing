import type { CreatedBooking, SubmitBookingInput } from "../domain/booking-request.model";
import type { BookingProtocol } from "../domain/booking.protocol";

export type SubmitBookingUseCase = (input: SubmitBookingInput) => Promise<CreatedBooking>;

/** Membuat booking dan menahan stok. Requirement: FR-15–19, BR-01, BR-02. */
export function createSubmitBookingUseCase({
  bookingService,
}: {
  bookingService: BookingProtocol;
}): SubmitBookingUseCase {
  return (input) => bookingService.submitBooking({ ...input, contactEmail: input.contactEmail.trim() });
}
