/**
 * @file webview-handoff.model.ts
 * @description WebView Payment Handoff Domain Models
 *
 * Requirements: 14.30, 14.33, BR-27
 * Source: ADR-007 — Serah-Terima Pembayaran dari Aplikasi Mobile ke WebView
 *
 * Kredensial kelima untuk alur mobile WebView: aplikasi meminta kode sekali pakai,
 * halaman web menukarnya dengan session yang hanya berlaku untuk satu booking.
 */

/* ========================================================================== */
/*                          Handoff Token Types                               */
/* ========================================================================== */

/**
 * Handoff code format: hc_{64 hex characters} (256 bit)
 *
 * Aturan ADR-007 §2:
 * - Sekali pakai
 * - Berlaku 60 detik
 * - Hanya untuk satu booking_id
 * - Diterbitkan setelah pemeriksaan grant
 */
export type HandoffCode = string;

/**
 * Payment session format: ps_{64 hex characters} (256 bit)
 *
 * Aturan ADR-007 §4:
 * - Dikirim via header X-Payment-Session
 * - Hanya untuk GET /bookings/{booking_id} dan endpoint payment (§5.1–§5.4)
 * - Hanya booking miliknya (booking lain → 404)
 * - Hidup selama grant hidup
 *
 * Aturan ADR-007 §6:
 * - Session hanya di memori halaman (bukan localStorage, cookie, atau URL)
 * - Muat ulang = session hilang = minta kode baru ke aplikasi (HANDOFF_EXPIRED)
 */
export type PaymentSession = string;

/* ========================================================================== */
/*                   Handoff API Responses                                    */
/* ========================================================================== */

/**
 * Handoff response dari POST /payments/{booking_id}/handoff
 *
 * ADR-007 §3: payment_url disusun oleh backend dari setelan PAYMENT_WEB_URL +
 * /m/orders/{booking_id}/pay#code={handoff_code}. Bila route web berubah,
 * aplikasi tidak perlu rilis ulang.
 */
export type HandoffResult = {
  /** Kode sekali pakai untuk ditukar dengan payment session */
  readonly handoffCode: HandoffCode;
  /** URL lengkap untuk dibuka di WebView: https://{domain}/m/orders/{booking_id}/pay#code={handoff_code} */
  readonly paymentUrl: string;
  /** ISO timestamp, ~60 detik dari sekarang */
  readonly expiresAt: string;
};

/**
 * Exchange response dari POST /payments/handoff/exchange
 *
 * Hasil penukaran handoff code menjadi payment session.
 * Session berlaku selama grant masih aktif.
 */
export type ExchangeResult = {
  /** Payment session untuk header X-Payment-Session */
  readonly paymentSession: PaymentSession;
  /** ISO timestamp, sama dengan grant expiry */
  readonly expiresAt: string;
};

/* ========================================================================== */
/*                   WebView ↔ Mobile Communication                           */
/* ========================================================================== */

/**
 * Pesan dari WebView ke aplikasi mobile via postMessage
 *
 * Dikirim via: window.ReactNativeWebView.postMessage(JSON.stringify({ type, bookingId }))
 *
 * ADR-007 §8: Pesan dari WebView hanyalah sinyal. Aplikasi selalu memastikan
 * lewat GET /bookings/{booking_id}. Yang menentukan lunas tetap webhook.
 *
 * | type              | Kapan                                                    |
 * |-------------------|----------------------------------------------------------|
 * | PAYMENT_DONE      | /status = PAID                                           |
 * | PAYMENT_EXPIRED   | /status = EXPIRED, PAYMENT_WINDOW_CLOSED, atau 401       |
 * | HANDOFF_EXPIRED   | Exchange 401, halaman dimuat ulang, atau session invalid |
 * | OPEN_EXTERNAL     | Tautan GoPay (gojek.link) perlu dibuka di luar WebView   |
 * | CLOSE             | Tombol kembali, tombol hasil, atau MAX_ATTEMPTS_EXCEEDED |
 */
export type WebViewMessage =
  | { readonly type: "PAYMENT_DONE"; readonly bookingId: string }
  | { readonly type: "PAYMENT_EXPIRED"; readonly bookingId: string }
  | { readonly type: "HANDOFF_EXPIRED"; readonly bookingId: string }
  | { readonly type: "OPEN_EXTERNAL"; readonly bookingId: string; readonly url: string }
  | { readonly type: "CLOSE"; readonly bookingId: string };

/* ========================================================================== */
/*                   WebView Detection Context                                */
/* ========================================================================== */

/**
 * Context untuk mendeteksi apakah halaman diakses via WebView
 *
 * ADR-007 §7: Halaman embed tidak pernah berpindah halaman. Dibuka di browser
 * biasa (tanpa window.ReactNativeWebView) → tampilkan "Buka dari aplikasi".
 *
 * ADR-007 §6: Session hanya di memori halaman (bukan localStorage, cookie, atau URL).
 */
export type WebViewContext = {
  /** true jika window.ReactNativeWebView ada (dibuka dari aplikasi mobile) */
  readonly isEmbedded: boolean;
  /** true jika URL fragment mengandung #code= */
  readonly hasHandoffCode: boolean;
  /** Disimpan di memori JS, bukan localStorage. null jika belum ditukar atau halaman dimuat ulang */
  readonly paymentSession: PaymentSession | null;
};
