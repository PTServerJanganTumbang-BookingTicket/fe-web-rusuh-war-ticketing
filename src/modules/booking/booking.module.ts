import { asFunction, type NameAndRegistrationPair } from "awilix";
import type { BookingProtocol } from "./domain/booking.protocol";
import { createGetBookingSessionUseCase } from "./application/get-booking-session.use-case";
import type { BookingDependencies } from "./application/booking.dependencies";
import { createHttpBookingService } from "./data/http-booking.service";

export type BookingRegistry = BookingDependencies & {
  bookingService: BookingProtocol;
};

export function bookingModule(): NameAndRegistrationPair<BookingRegistry> {
  return {
    bookingService: asFunction(createHttpBookingService).singleton(),
    getBookingSessionUseCase: asFunction(createGetBookingSessionUseCase).singleton(),
  };
}
