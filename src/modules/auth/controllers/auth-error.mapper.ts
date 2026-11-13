import type { AppError, ApiErrorCode } from "@/core/domain/app-error";
import { EMAIL_MAX_LENGTH } from "@/core/domain/email.constants";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { EmailInputError } from "../domain/account.rules";

/** Pesan galat isian email, sama di form masuk dan daftar. */
export function emailErrorMessage(problem: EmailInputError): string {
  if (problem === "required") return t("login.email.required");
  if (problem === "too_long") return t("login.email.tooLong", { max: EMAIL_MAX_LENGTH });
  return t("login.email.invalid");
}

/**
 * Galat email yang ditampilkan sekarang. Terlalu panjang tampil seketika karena mengetik lebih lanjut tidak akan
 * memperbaikinya; kosong dan bentuk salah menunggu field ditinggalkan atau form dikirim (`revealed`).
 */
export function visibleEmailError(problem: EmailInputError | null, revealed: boolean): string | undefined {
  return problem && (revealed || problem === "too_long") ? emailErrorMessage(problem) : undefined;
}

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
