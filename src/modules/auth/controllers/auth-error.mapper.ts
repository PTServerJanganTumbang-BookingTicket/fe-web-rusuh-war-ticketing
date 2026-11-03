import type { AppError, ApiErrorCode } from "@/core/domain/app-error";
import type { MessageKey } from "@/core/i18n/t.utils";

/** Pesan galat per layar: kode yang dikenal layar itu, lalu jaringan, lalu pesan umum. Pesan mentah tidak dipakai. */
export function authErrorKey(
  error: AppError,
  known: Partial<Record<ApiErrorCode, MessageKey>> = {},
): MessageKey {
  if (error.kind === "api") {
    if (error.code === "RATE_LIMITED") return "auth.error.RATE_LIMITED";
    const key = known[error.code];
    if (key) return key;
  }
  return error.kind === "network" ? "auth.error.network" : "auth.error.unknown";
}
