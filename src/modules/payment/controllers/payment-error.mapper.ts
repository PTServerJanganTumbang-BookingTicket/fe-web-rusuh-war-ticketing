/**
 * @file payment-error.mapper.ts
 * @description Error code to i18n mapping untuk payment page.
 *
 * Requirements: 14.18-14.20
 * Memetakan setiap error_code dari API ke pesan UI yang user-friendly.
 *
 * WebView error codes (ADR-007):
 * - HANDOFF_CODE_INVALID → App handles via HANDOFF_EXPIRED postMessage
 * - PAYMENT_SESSION_INVALID → App handles via HANDOFF_EXPIRED postMessage
 * - GRANT_TOKEN_INVALID → App handles via PAYMENT_EXPIRED postMessage
 * - VALIDATION_ERROR → Generic validation error
 *
 * Note: User di WebView tidak akan melihat error message karena app akan
 * menangani via postMessage. Error messages ini untuk fallback/logging.
 */
import type { MessageKey } from "@/core/i18n/t.utils";
/* ========================================================================== */
/*                               Error Codes                                  */
/* ========================================================================== */
/**
 * Error codes dari API payment.
 * Requirement 14.18: Mapping error_code ke pesan UI.
 *
 * WebView error codes (ADR-007):
 * | Error                    | WebView Message    |
 * |--------------------------|--------------------|
 * | HANDOFF_CODE_INVALID     | → HANDOFF_EXPIRED  |
 * | PAYMENT_SESSION_INVALID  | → HANDOFF_EXPIRED  |
 * | GRANT_TOKEN_INVALID      | → PAYMENT_EXPIRED  |
 */
export type PaymentErrorCode =
  | "PAYMENT_GATEWAY_UNAVAILABLE"
  | "BOOKING_STATUS_INVALID"
  | "PAYMENT_WINDOW_CLOSED"
  | "MAX_ATTEMPTS_EXCEEDED"
  | "PAYMENT_ALREADY_SETTLED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR"
  // WebView error codes (ADR-007, Requirement 14.18)
  | "HANDOFF_CODE_INVALID"
  | "PAYMENT_SESSION_INVALID"
  | "GRANT_TOKEN_INVALID"
  | "VALIDATION_ERROR";
/* ========================================================================== */
/*                            Error Mapping                                   */
/* ========================================================================== */
/**
 * Mapping dari error code ke i18n message key.
 *
 * Requirement 14.18:
 * | Error Code                    | UI Copy (ID)                                                                      |
 * |-------------------------------|-----------------------------------------------------------------------------------|
 * | PAYMENT_GATEWAY_UNAVAILABLE   | Sistem Pembayaran Sedang Sibuk. Mohon tunggu beberapa saat dan coba lagi.        |
 * | BOOKING_STATUS_INVALID        | Booking Tidak Valid. Status booking Anda telah berubah.                          |
 * | PAYMENT_WINDOW_CLOSED         | Waktu Pembayaran Habis. Maaf, waktu untuk menyelesaikan pembayaran telah berakhir.|
 * | MAX_ATTEMPTS_EXCEEDED         | Batas Percobaan Tercapai. Anda telah mencapai batas maksimal percobaan pembayaran.|
 * | PAYMENT_ALREADY_SETTLED       | Pembayaran Sudah Diterima. Pembayaran Anda sedang diproses.                      |
 *
 * WebView error codes (ADR-007):
 * | Error Code                    | UI Copy (ID) — fallback/logging only                                              |
 * |-------------------------------|-----------------------------------------------------------------------------------|
 * | HANDOFF_CODE_INVALID          | Kode akses tidak valid atau sudah kedaluwarsa. Kembali ke aplikasi dan coba lagi.|
 * | PAYMENT_SESSION_INVALID       | Sesi pembayaran berakhir. Halaman perlu dimuat ulang dari aplikasi.              |
 * | GRANT_TOKEN_INVALID           | Sesi booking berakhir. Silakan booking ulang dari aplikasi.                      |
 * | VALIDATION_ERROR              | Permintaan tidak valid. Silakan coba lagi.                                       |
 */
const ERROR_CODE_TO_MESSAGE_KEY: Record<PaymentErrorCode, MessageKey> = {
  PAYMENT_GATEWAY_UNAVAILABLE: "payment.error.PAYMENT_GATEWAY_UNAVAILABLE",
  BOOKING_STATUS_INVALID: "payment.error.BOOKING_STATUS_INVALID",
  PAYMENT_WINDOW_CLOSED: "payment.error.PAYMENT_WINDOW_CLOSED",
  MAX_ATTEMPTS_EXCEEDED: "payment.error.MAX_ATTEMPTS_EXCEEDED",
  PAYMENT_ALREADY_SETTLED: "payment.error.PAYMENT_ALREADY_SETTLED",
  NETWORK_ERROR: "payment.error.network",
  UNKNOWN_ERROR: "payment.error.unknown",
  // WebView error codes (ADR-007, Requirement 14.18)
  HANDOFF_CODE_INVALID: "payment.error.HANDOFF_CODE_INVALID",
  PAYMENT_SESSION_INVALID: "payment.error.PAYMENT_SESSION_INVALID",
  GRANT_TOKEN_INVALID: "payment.error.GRANT_TOKEN_INVALID",
  VALIDATION_ERROR: "payment.error.VALIDATION_ERROR",
};
/**
 * Mendapatkan i18n message key dari error code.
 *
 * @param errorCode - Error code dari API
 * @returns Message key untuk i18n
 */
export function getPaymentErrorMessageKey(errorCode: PaymentErrorCode): MessageKey {
  return ERROR_CODE_TO_MESSAGE_KEY[errorCode];
}
/**
 * Mengubah error code dari API response ke PaymentErrorCode.
 * Menangani kasus error yang tidak dikenal.
 *
 * @param code - Error code string dari API
 * @returns PaymentErrorCode yang valid
 */
export function parsePaymentErrorCode(code: string | undefined | null): PaymentErrorCode {
  if (code == null) {
    return "UNKNOWN_ERROR";
  }
  const validCodes: PaymentErrorCode[] = [
    "PAYMENT_GATEWAY_UNAVAILABLE",
    "BOOKING_STATUS_INVALID",
    "PAYMENT_WINDOW_CLOSED",
    "MAX_ATTEMPTS_EXCEEDED",
    "PAYMENT_ALREADY_SETTLED",
    "NETWORK_ERROR",
    // WebView error codes (ADR-007, Requirement 14.18)
    "HANDOFF_CODE_INVALID",
    "PAYMENT_SESSION_INVALID",
    "GRANT_TOKEN_INVALID",
    "VALIDATION_ERROR",
  ];
  if (validCodes.includes(code as PaymentErrorCode)) {
    return code as PaymentErrorCode;
  }
  return "UNKNOWN_ERROR";
}
/* ========================================================================== */
/*                          Special Error Handling                            */
/* ========================================================================== */
/**
 * Requirement 14.19:
 * WHEN error PAYMENT_GATEWAY_UNAVAILABLE (503) terjadi saat charge,
 * THE Frontend SHALL menampilkan pesan error dan mengaktifkan tombol retry setelah 5 detik.
 */
export const GATEWAY_UNAVAILABLE_RETRY_DELAY_MS = 5_000;
/**
 * Mengecek apakah error adalah gateway unavailable yang bisa di-retry.
 *
 * @param errorCode - Error code dari API
 * @returns true jika error adalah gateway unavailable
 */
export function isGatewayUnavailableError(errorCode: PaymentErrorCode): boolean {
  return errorCode === "PAYMENT_GATEWAY_UNAVAILABLE";
}
/**
 * Requirement 14.20:
 * WHEN error BOOKING_STATUS_INVALID (409) terjadi saat charge pada countdown mendekati 0,
 * THE Frontend SHALL memperlakukan ini sebagai "waktu habis" dan transisi ke state EXPIRED.
 *
 * @param errorCode - Error code dari API
 * @param remainingMs - Sisa waktu countdown dalam milliseconds
 * @param thresholdMs - Threshold "mendekati 0" dalam milliseconds (default 5 detik)
 * @returns true jika harus diperlakukan sebagai expired
 */
export function shouldTreatAsExpired(
  errorCode: PaymentErrorCode,
  remainingMs: number,
  thresholdMs: number = 5_000,
): boolean {
  return errorCode === "BOOKING_STATUS_INVALID" && remainingMs <= thresholdMs;
}
/**
 * Mengecek apakah error menandakan pembayaran sudah settled (sukses di backend).
 * Digunakan untuk kasus race condition saat ganti metode.
 *
 * Requirement 14.17:
 * IF response 409 PAYMENT_ALREADY_SETTLED, THE Frontend SHALL mengabaikan
 * dan membiarkan polling menangkap status PAID.
 *
 * @param errorCode - Error code dari API
 * @returns true jika pembayaran sudah settled
 */
export function isAlreadySettledError(errorCode: PaymentErrorCode): boolean {
  return errorCode === "PAYMENT_ALREADY_SETTLED";
}
/* ========================================================================== */
/*                            Error Recovery Info                             */
/* ========================================================================== */
/**
 * Informasi recovery untuk setiap error code.
 */
export type ErrorRecoveryInfo = {
  /** Apakah user bisa retry */
  readonly canRetry: boolean;
  /** Delay sebelum retry diaktifkan (ms) */
  readonly retryDelayMs: number;
  /** Apakah harus redirect ke home */
  readonly shouldRedirectHome: boolean;
  /** Apakah error ini adalah kondisi terminal */
  readonly isTerminal: boolean;
};
/**
 * Mendapatkan informasi recovery untuk error code.
 *
 * @param errorCode - Error code dari API
 * @returns Informasi recovery
 */
export function getErrorRecoveryInfo(errorCode: PaymentErrorCode): ErrorRecoveryInfo {
  switch (errorCode) {
    case "PAYMENT_GATEWAY_UNAVAILABLE":
      // Req 14.19: retry setelah 5 detik
      return {
        canRetry: true,
        retryDelayMs: GATEWAY_UNAVAILABLE_RETRY_DELAY_MS,
        shouldRedirectHome: false,
        isTerminal: false,
      };
    case "BOOKING_STATUS_INVALID":
      // Bisa jadi expired atau status berubah
      return {
        canRetry: false,
        retryDelayMs: 0,
        shouldRedirectHome: false,
        isTerminal: false,
      };
    case "PAYMENT_WINDOW_CLOSED":
      // Waktu habis, harus ke home
      return {
        canRetry: false,
        retryDelayMs: 0,
        shouldRedirectHome: true,
        isTerminal: true,
      };
    case "MAX_ATTEMPTS_EXCEEDED":
      // Sudah 3x gagal, tidak bisa retry lagi
      return {
        canRetry: false,
        retryDelayMs: 0,
        shouldRedirectHome: true,
        isTerminal: true,
      };
    case "PAYMENT_ALREADY_SETTLED":
      // Sukses di backend, polling akan menangkap
      return {
        canRetry: false,
        retryDelayMs: 0,
        shouldRedirectHome: false,
        isTerminal: false,
      };
    case "NETWORK_ERROR":
      // Masalah koneksi, bisa retry
      return {
        canRetry: true,
        retryDelayMs: 0,
        shouldRedirectHome: false,
        isTerminal: false,
      };
    // WebView error codes (ADR-007, Requirement 14.18)
    // Note: App menangani via postMessage; ini untuk fallback/logging
    case "HANDOFF_CODE_INVALID":
      // Handoff code expired atau invalid → app handles via HANDOFF_EXPIRED
      return {
        canRetry: false,
        retryDelayMs: 0,
        shouldRedirectHome: false, // App akan handle redirect
        isTerminal: true,
      };
    case "PAYMENT_SESSION_INVALID":
      // Payment session expired → app handles via HANDOFF_EXPIRED
      return {
        canRetry: false,
        retryDelayMs: 0,
        shouldRedirectHome: false, // App akan handle redirect
        isTerminal: true,
      };
    case "GRANT_TOKEN_INVALID":
      // Grant token expired → app handles via PAYMENT_EXPIRED
      return {
        canRetry: false,
        retryDelayMs: 0,
        shouldRedirectHome: false, // App akan handle redirect
        isTerminal: true,
      };
    case "VALIDATION_ERROR":
      // Generic validation error, bisa retry
      return {
        canRetry: true,
        retryDelayMs: 0,
        shouldRedirectHome: false,
        isTerminal: false,
      };
    case "UNKNOWN_ERROR":
    default:
      return {
        canRetry: true,
        retryDelayMs: 0,
        shouldRedirectHome: false,
        isTerminal: false,
      };
  }
}
