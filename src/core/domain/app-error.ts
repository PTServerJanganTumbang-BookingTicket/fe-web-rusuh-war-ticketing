// Katalog error code FE (ADR-0009). Kontrak membawa `meta.error_code`, tetapi kodenya per endpoint dan lebih halus
// daripada kebutuhan UI, jadi service memetakan status HTTP per endpoint ke kode ini (`RequestOptions.errorCodes`);
// `meta.message` yang sama persis juga dikenali.
export type ApiErrorCode =
  | "NIK_INVALID"
  | "QUOTA_EXCEEDED"
  | "STOCK_INSUFFICIENT"
  | "ACCESS_EXPIRED"
  | "QUEUE_TOKEN_INVALID"
  | "SLOT_TAKEN_OVER"
  | "PAYMENT_EXPIRED"
  | "QUEUE_FULL"
  | "FULL_BOOKED"
  | "CAPTCHA_FAILED"
  | "SALE_NOT_OPEN"
  | "SALE_CLOSED"
  | "RATE_LIMITED"
  | "NIK_ALREADY_REGISTERED"
  | "CONSENT_REQUIRED"
  | "LOGIN_LINK_INVALID"
  | "EMAIL_LINK_INVALID"
  | "UNAUTHENTICATED"
  | "SAVED_NIK_REJECTED"
  | "BOOKING_REJECTED"
  | "BOOKING_INVALID"
  | "TICKET_NOT_FOUND"
  | "HANDOFF_CODE_INVALID"
  | "GRANT_EXPIRED";

export type AppError =
  | { kind: "api"; code: ApiErrorCode; status: number }
  | { kind: "network" }
  | { kind: "invalid_response" }
  | { kind: "unknown"; status?: number };

const API_ERROR_CODES: readonly string[] = [
  "NIK_INVALID",
  "QUOTA_EXCEEDED",
  "STOCK_INSUFFICIENT",
  "ACCESS_EXPIRED",
  "QUEUE_TOKEN_INVALID",
  "SLOT_TAKEN_OVER",
  "PAYMENT_EXPIRED",
  "QUEUE_FULL",
  "FULL_BOOKED",
  "CAPTCHA_FAILED",
  "SALE_NOT_OPEN",
  "SALE_CLOSED",
  "RATE_LIMITED",
  "NIK_ALREADY_REGISTERED",
  "CONSENT_REQUIRED",
  "LOGIN_LINK_INVALID",
  "EMAIL_LINK_INVALID",
  "UNAUTHENTICATED",
  "SAVED_NIK_REJECTED",
  "BOOKING_REJECTED",
  "BOOKING_INVALID",
  "TICKET_NOT_FOUND",
  "HANDOFF_CODE_INVALID",
  "GRANT_EXPIRED",
];

export function parseApiErrorCode(value: unknown): ApiErrorCode | undefined {
  return typeof value === "string" && API_ERROR_CODES.includes(value) ? (value as ApiErrorCode) : undefined;
}

// TanStack Query mengharuskan error di-throw, jadi AppError dibungkus.
// Pesan sengaja tidak untuk ditampilkan; controller memetakan `error` ke key i18n.
export class AppFailure extends Error {
  constructor(readonly error: AppError) {
    super(`AppFailure:${error.kind}`);
    this.name = "AppFailure";
  }
}

export function toAppError(thrown: unknown): AppError {
  return thrown instanceof AppFailure ? thrown.error : { kind: "unknown" };
}
