import { asClass, type NameAndRegistrationPair } from "awilix";
import type { BookingProtocol } from "./domain/booking.protocol";
import { GetBookingSessionUseCase } from "./application/get-booking-session.use-case";
import type { BookingDependencies } from "./application/booking.dependencies";
import { HttpBookingService } from "./data/http-booking.service";

export type BookingRegistry = BookingDependencies & {
  bookingService: BookingProtocol;
};

export function bookingModule(): NameAndRegistrationPair<BookingRegistry> {
  return {
    bookingService: asClass(HttpBookingService).singleton(),
    getBookingSessionUseCase: asClass(GetBookingSessionUseCase).singleton(),
  };
}
