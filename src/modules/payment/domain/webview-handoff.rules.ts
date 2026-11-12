/**
 * @file webview-handoff.rules.ts
 * @description WebView Payment Handoff Business Rules
 *
 * Requirements: 14.32, BR-27, BR-29, BR-30, BR-31
 * Source: ADR-007 — Serah-Terima Pembayaran dari Aplikasi Mobile ke WebView
 *
 * Aturan keamanan handoff code dan payment session:
 * - ADR-007 §1: Tidak ada kredensial di URL. URL WebView hanya membawa booking_id dan #code=
 * - ADR-007 §2: Kode sekali pakai (hc_…, 256 bit), 60 detik, untuk satu booking_id
 * - ADR-007 §6: Session hanya di memori halaman (bukan localStorage, cookie, atau URL)
 * - ADR-007 §7: Tanpa window.ReactNativeWebView → tampilkan "Buka dari aplikasi"
 * - ADR-007 §8: Pesan dari WebView hanyalah sinyal, aplikasi memastikan via GET /bookings/{id}
 *
 * NOTE: Fungsi browser (extractHandoffCodeFromFragment, removeCodeFromUrl, isReactNativeWebView, postMessageToApp)
 * mengakses window object. Ini adalah pengecualian dari aturan domain layer karena:
 * 1. Design.md secara eksplisit menempatkan fungsi ini di domain layer
 * 2. Fungsi ini adalah aturan bisnis WebView handoff yang harus tersedia untuk use case
 * 3. Semua fungsi sudah SSR-safe dengan guard `typeof window === 'undefined'`
 */

/* eslint-disable no-restricted-globals -- ADR-007: WebView handoff rules membutuhkan akses window untuk deteksi environment dan URL fragment */

import type { WebViewMessage } from "./webview-handoff.model";

/* ========================================================================== */
/*                            Validation Patterns                             */
/* ========================================================================== */

/**
 * Regex untuk validasi format handoff code: hc_{64 hex}
 *
 * ADR-007 §2: Kode serah-terima (hc_…, 256 bit)
 * Format: prefix "hc_" diikuti 64 karakter hex (256 bit)
 */
export const HANDOFF_CODE_REGEX = /^hc_[a-f0-9]{64}$/;

/**
 * Regex untuk validasi format payment session: ps_{64 hex}
 *
 * ADR-007 §4: Payment session (ps_…, 256 bit)
 * Format: prefix "ps_" diikuti 64 karakter hex (256 bit)
 */
export const PAYMENT_SESSION_REGEX = /^ps_[a-f0-9]{64}$/;

/* ========================================================================== */
/*                         Handoff Configuration                              */
/* ========================================================================== */

/**
 * TTL handoff code dalam detik.
 *
 * ADR-007 §2: Sekali pakai, 60 detik, untuk satu booking_id
 */
export const HANDOFF_CODE_TTL_SECONDS = 60;

/**
 * Rate limit: max kode per grant per menit.
 *
 * BR-31: Mencegah abuse dengan membatasi jumlah handoff code yang bisa diminta
 */
export const HANDOFF_RATE_LIMIT_PER_MINUTE = 10;

/**
 * Domain yang diizinkan untuk WebView (production).
 *
 * BR-29: Validasi domain untuk keamanan origin
 */
export const ALLOWED_WEBVIEW_DOMAIN = "rush-my-ticket.my.id";

/* ========================================================================== */
/*                         Validation Functions                               */
/* ========================================================================== */

/**
 * Validasi format handoff code.
 *
 * BR-27: Handoff code harus dalam format hc_{64 hex}
 *
 * @param code - String yang akan divalidasi
 * @returns true jika format valid
 */
export function isValidHandoffCode(code: string): boolean {
  return HANDOFF_CODE_REGEX.test(code);
}

/**
 * Validasi format payment session.
 *
 * BR-27: Payment session harus dalam format ps_{64 hex}
 *
 * @param session - String yang akan divalidasi
 * @returns true jika format valid
 */
export function isValidPaymentSession(session: string): boolean {
  return PAYMENT_SESSION_REGEX.test(session);
}

/* ========================================================================== */
/*                     URL Fragment Extraction Functions                      */
/* ========================================================================== */

/**
 * Extract handoff code dari URL fragment (#code=hc_...).
 *
 * ADR-007 §1: Fragment tidak dikirim ke server, jadi aman dari logging.
 * URL pattern: https://{domain}/m/orders/{booking_id}/pay#code={handoff_code}
 *
 * @returns Handoff code jika ditemukan, null jika tidak ada atau SSR
 */
export function extractHandoffCodeFromFragment(): string | null {
  // SSR-safe check
  if (typeof window === "undefined") return null;

  const hash = window.location.hash;
  const match = hash.match(/code=([^&]+)/);
  return match?.[1] ?? null;
}

/**
 * Hapus handoff code dari URL menggunakan history.replaceState.
 *
 * ADR-007 §1: Mencegah code bocor di browser history.
 * Dipanggil segera setelah code di-extract untuk keamanan.
 */
export function removeCodeFromUrl(): void {
  // SSR-safe check
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState(null, "", url.toString());
}

/* ========================================================================== */
/*                       WebView Detection Functions                          */
/* ========================================================================== */

/**
 * Deteksi apakah halaman dibuka di WebView React Native.
 *
 * ADR-007 §7: Halaman embed tidak pernah berpindah halaman.
 * Tanpa window.ReactNativeWebView → tampilkan "Buka dari aplikasi".
 *
 * TIDAK menggunakan navigator.userAgent karena tidak reliable
 * dan bisa di-spoof oleh browser.
 *
 * @returns true jika dalam WebView React Native dengan postMessage tersedia
 */
export function isReactNativeWebView(): boolean {
  if (typeof window === "undefined") return false;

  // Type-safe check for ReactNativeWebView
  const windowWithWebView = window as unknown as {
    ReactNativeWebView?: {
      postMessage?: (data: string) => void;
    };
  };

  return (
    "ReactNativeWebView" in window &&
    windowWithWebView.ReactNativeWebView !== undefined &&
    typeof windowWithWebView.ReactNativeWebView.postMessage === "function"
  );
}

/* ========================================================================== */
/*                       WebView Communication Functions                      */
/* ========================================================================== */

/**
 * Kirim pesan ke aplikasi mobile via postMessage.
 *
 * ADR-007 §8: Pesan dari WebView hanyalah sinyal.
 * Aplikasi HARUS konfirmasi status sebenarnya via GET /bookings/{booking_id}.
 *
 * Yang menentukan lunas tetap webhook dari payment gateway,
 * bukan sinyal dari WebView.
 *
 * @param message - WebViewMessage yang akan dikirim
 */
export function postMessageToApp(message: WebViewMessage): void {
  if (!isReactNativeWebView()) return;

  // Type-safe access to ReactNativeWebView
  const windowWithWebView = window as unknown as {
    ReactNativeWebView: {
      postMessage: (data: string) => void;
    };
  };

  windowWithWebView.ReactNativeWebView.postMessage(JSON.stringify(message));
}
