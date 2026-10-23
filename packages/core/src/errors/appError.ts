// Katalog error code dari kontrak BE (ADR-0009).
export type ApiErrorCode =
  | "NIK_INVALID"
  | "QUOTA_EXCEEDED"
  | "STOCK_INSUFFICIENT"
  | "ACCESS_EXPIRED"
  | "QUEUE_TOKEN_INVALID"
  | "SLOT_TAKEN_OVER"
  | "PAYMENT_EXPIRED"
  // Auth (ADR-0010, Figma SJT ZAKI "Error & Fallback States"). KONTRAK-ASUMSI sampai katalog BE final.
  | "UNAUTHENTICATED"
  | "SESSION_REVOKED"
  | "LOGIN_LINK_INVALID"
  | "RATE_LIMITED"
  // Registrasi (Figma SJT ZAKI "Error & Fallback States" C, D, G, H). KONTRAK-ASUMSI.
  | "EMAIL_ALREADY_REGISTERED"
  | "NIK_VERIFICATION_UNAVAILABLE"
  | "NIK_MISMATCH"
  | "VERIFICATION_LINK_INVALID";

export type AppError =
  /** `retryAfterMs` dari header Retry-After (mis. RATE_LIMITED); tombol coba lagi menunggu nilai ini. */
  | { kind: "api"; code: ApiErrorCode; status: number; retryAfterMs?: number }
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
  "UNAUTHENTICATED",
  "SESSION_REVOKED",
  "LOGIN_LINK_INVALID",
  "RATE_LIMITED",
  "EMAIL_ALREADY_REGISTERED",
  "NIK_VERIFICATION_UNAVAILABLE",
  "NIK_MISMATCH",
  "VERIFICATION_LINK_INVALID",
];

export function parseApiErrorCode(value: unknown): ApiErrorCode | undefined {
  return typeof value === "string" && API_ERROR_CODES.includes(value)
    ? (value as ApiErrorCode)
    : undefined;
}

// TanStack Query mengharuskan error di-throw, jadi AppError dibungkus.
// Pesan sengaja tidak untuk ditampilkan; ViewModel memetakan `error` ke key i18n.
export class AppFailure extends Error {
  constructor(readonly error: AppError) {
    super(`AppFailure:${error.kind}`);
    this.name = "AppFailure";
  }
}

export function toAppError(thrown: unknown): AppError {
  return thrown instanceof AppFailure ? thrown.error : { kind: "unknown" };
}

/** Server menjawab bahwa sesi booking sudah berakhir. Satu-satunya penentu expired di FE (ADR-0005). */
export function isAccessExpired(error: AppError): boolean {
  return error.kind === "api" && error.code === "ACCESS_EXPIRED";
}

/** Server menolak karena belum login atau sesi dicabut login di perangkat lain (ADR-0010). Customer perlu login ulang. */
export function isAuthRequired(error: AppError): boolean {
  return error.kind === "api" && (error.code === "UNAUTHENTICATED" || error.code === "SESSION_REVOKED");
}
