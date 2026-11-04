import { asFunction, type NameAndRegistrationPair } from "awilix";
import type { BookingProtocol } from "./domain/booking.protocol";
import { createGetBookingEventUseCase } from "./application/get-booking-event.use-case";
import { createGetBookingSessionUseCase } from "./application/get-booking-session.use-case";
import { createSubmitBookingUseCase } from "./application/submit-booking.use-case";
import { createValidateNikUseCase } from "./application/validate-nik.use-case";
import type { BookingDependencies } from "./application/booking.dependencies";
import { createHttpBookingService } from "./data/http-booking.service";

export type BookingRegistry = BookingDependencies & {
  bookingService: BookingProtocol;
};

export function bookingModule(): NameAndRegistrationPair<BookingRegistry> {
  return {
    bookingService: asFunction(createHttpBookingService).singleton(),
    getBookingSessionUseCase: asFunction(createGetBookingSessionUseCase).singleton(),
    getBookingEventUseCase: asFunction(createGetBookingEventUseCase).singleton(),
    validateNikUseCase: asFunction(createValidateNikUseCase).singleton(),
    submitBookingUseCase: asFunction(createSubmitBookingUseCase).singleton(),
  };
}
