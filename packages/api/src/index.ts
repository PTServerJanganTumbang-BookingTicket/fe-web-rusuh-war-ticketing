export { listEvents } from "./adapters/events";
export { getBookingSession } from "./adapters/booking";
export { emulatePaymentOutcome, getOrder, startPayment } from "./adapters/payment";
export { getQueueState } from "./adapters/queue";
export { startSession } from "./adapters/session";
export { emulateLastEmailLink, endSession, getMe, redeemLoginLink, registerAccount, sendLoginLink, sendVerificationEmail, verifyEmail } from "./adapters/auth";
export { bookingSessionQuery, meQuery, orderQuery, queuePositionQuery } from "./queries";
export { queryKeys } from "./queryKeys";

// Tipe DTO untuk handler MSW di `mocks`, supaya mock tidak bisa melenceng dari kontrak (ADR-0017).
export type {
  EmailLinkSentResponseDto,
  LastEmailLinkResponseDto,
  LoginLinkRequestDto,
  MeResponseDto,
  RedeemLoginLinkRequestDto,
  RegisterRequestDto,
  VerificationEmailRequestDto,
  VerifyEmailRequestDto,
} from "./contracts/auth";
export type { BookingSessionResponseDto } from "./contracts/booking";
export type { EventsResponseDto } from "./contracts/events";
export type { OrderResponseDto, PaymentInstructionDto, PaymentOutcomeRequestDto, StartPaymentRequestDto } from "./contracts/payment";
export type { QueueResponseDto } from "./contracts/queue";
