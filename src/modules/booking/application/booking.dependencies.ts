import type { GetBookingEventUseCase } from "./get-booking-event.use-case";
import type { GetBookingSessionUseCase } from "./get-booking-session.use-case";
import type { SubmitBookingUseCase } from "./submit-booking.use-case";
import type { ValidateNikUseCase } from "./validate-nik.use-case";
import type { ListHolderAliasesUseCase } from "./list-holder-aliases.use-case";

export type BookingDependencies = {
  getBookingSessionUseCase: GetBookingSessionUseCase;
  getBookingEventUseCase: GetBookingEventUseCase;
  validateNikUseCase: ValidateNikUseCase;
  submitBookingUseCase: SubmitBookingUseCase;
  listHolderAliasesUseCase: ListHolderAliasesUseCase;
};
