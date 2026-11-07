import { asFunction, type NameAndRegistrationPair } from "awilix";
import type { BookingProtocol } from "./domain/booking.protocol";
import type { HolderAliasProtocol } from "./domain/holder-alias.protocol";
import { createGetBookingEventUseCase } from "./application/get-booking-event.use-case";
import { createGetBookingSessionUseCase } from "./application/get-booking-session.use-case";
import { createSubmitBookingUseCase } from "./application/submit-booking.use-case";
import { createValidateNikUseCase } from "./application/validate-nik.use-case";
import { createListHolderAliasesUseCase } from "./application/list-holder-aliases.use-case";
import type { BookingDependencies } from "./application/booking.dependencies";
import { createHttpBookingService } from "./data/http-booking.service";
import { createHttpHolderAliasService } from "./data/http-holder-alias.service";

export type BookingRegistry = BookingDependencies & {
  bookingService: BookingProtocol;
  holderAliasService: HolderAliasProtocol;
};

export function bookingModule(): NameAndRegistrationPair<BookingRegistry> {
  return {
    bookingService: asFunction(createHttpBookingService).singleton(),
    holderAliasService: asFunction(createHttpHolderAliasService).singleton(),
    getBookingSessionUseCase: asFunction(createGetBookingSessionUseCase).singleton(),
    getBookingEventUseCase: asFunction(createGetBookingEventUseCase).singleton(),
    validateNikUseCase: asFunction(createValidateNikUseCase).singleton(),
    submitBookingUseCase: asFunction(createSubmitBookingUseCase).singleton(),
    listHolderAliasesUseCase: asFunction(createListHolderAliasesUseCase).singleton(),
  };
}
