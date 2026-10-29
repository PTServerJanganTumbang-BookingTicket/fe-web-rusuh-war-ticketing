import type { GetBookingSessionUseCase } from "./get-booking-session.use-case";

export type BookingDependencies = {
  getBookingSessionUseCase: GetBookingSessionUseCase;
};
