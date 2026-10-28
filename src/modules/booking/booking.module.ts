import { asClass, type NameAndRegistrationPair } from "awilix";
import type { BookingRepository } from "./application/BookingRepository";
import { GetBookingSession } from "./application/GetBookingSession";
import type { BookingDependencies } from "./application/dependencies";
import { HttpBookingRepository } from "./infrastructure/HttpBookingRepository";

export type BookingCradle = BookingDependencies & {
  bookingRepository: BookingRepository;
};

export function bookingModule(): NameAndRegistrationPair<BookingCradle> {
  return {
    bookingRepository: asClass(HttpBookingRepository).singleton(),
    getBookingSession: asClass(GetBookingSession).singleton(),
  };
}
