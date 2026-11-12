/**
 * @file webview-handoff.protocol.ts
 * @description WebView Payment Handoff Protocol - API Contracts
 *
 * Requirements: 14.31, 14.32, BR-28
 * Source: ADR-007 — Serah-Terima Pembayaran dari Aplikasi Mobile ke WebView
 *
 * Endpoints yang didefinisikan:
 *   - POST /payments/{booking_id}/handoff  → requestHandoff (§5.6)
 *   - POST /payments/handoff/exchange      → exchangeHandoffCode (§5.7)
 *
 * WebView bridge via window.ReactNativeWebView.postMessage() (§8)
 */

import type { ExchangeResult, HandoffCode, HandoffResult } from "./webview-handoff.model";

/* ========================================================================== */
/*                          WebView Handoff Protocol                          */
/* ========================================================================== */

/**
 * Protocol untuk alur handoff dari aplikasi mobile ke WebView.
 *
 * Catatan arsitektur (ADR-007 §2–§4):
 * - Handoff code sekali pakai, berlaku 60 detik, terikat ke satu booking_id
 * - Payment session hanya di memori halaman (bukan localStorage, cookie, atau URL)
 * - Session hidup selama grant hidup
 */
export interface WebViewHandoffProtocol {
  /**
   * POST /payments/{booking_id}/handoff — Request handoff code untuk membuka
   * Payment Page di WebView.
   *
   * Ref: ADR-007 §5.6
   *
   * Dipanggil oleh aplikasi mobile sebelum membuka WebView.
   * Rate limit: max 10 kode per grant per menit (BR-28).
   *
   * Headers required:
   * - X-Grant-Token (wajib)
   * - X-Device-Id (untuk guest) ATAU Authorization (untuk login)
   *
   * @param bookingId - ID booking yang akan dibayar
   * @returns HandoffResult berisi code, URL lengkap, dan waktu kadaluarsa
   */
  requestHandoff(bookingId: string): Promise<HandoffResult>;

  /**
   * POST /payments/handoff/exchange — Tukar handoff code menjadi payment session.
   *
   * Ref: ADR-007 §5.7
   *
   * Dipanggil oleh halaman web saat pertama kali dimuat di WebView.
   * Handoff code sekali pakai, berlaku 60 detik, terikat ke booking_id.
   *
   * Errors:
   * - HANDOFF_CODE_INVALID: code sudah digunakan, expired, atau tidak cocok
   * - GRANT_TOKEN_INVALID: grant tidak ada lagi (booking sudah berakhir)
   *
   * @param bookingId - ID booking dari URL
   * @param handoffCode - Kode dari URL fragment (#code=...)
   * @returns ExchangeResult berisi payment session dan waktu kadaluarsa
   */
  exchangeHandoffCode(bookingId: string, handoffCode: HandoffCode): Promise<ExchangeResult>;
}

/* ========================================================================== */
/*                          WebView Bridge Protocol                           */
/* ========================================================================== */

/**
 * Protocol untuk komunikasi dari WebView ke aplikasi mobile.
 *
 * Ref: ADR-007 §8
 *
 * Implementasi mengirim pesan via:
 *   window.ReactNativeWebView.postMessage(JSON.stringify({ type, bookingId, ... }))
 *
 * Catatan: Pesan dari WebView hanyalah sinyal. Aplikasi selalu memastikan
 * lewat GET /bookings/{booking_id}. Yang menentukan lunas tetap webhook.
 *
 * | Method                | Type di postMessage   | Kapan                                    |
 * |-----------------------|-----------------------|------------------------------------------|
 * | notifyPaymentDone     | PAYMENT_DONE          | /status = PAID                           |
 * | notifyPaymentExpired  | PAYMENT_EXPIRED       | /status = EXPIRED atau PAYMENT_WINDOW_CLOSED |
 * | notifyHandoffExpired  | HANDOFF_EXPIRED       | Exchange 401, reload, atau session invalid |
 * | requestOpenExternal   | OPEN_EXTERNAL         | GoPay deeplink (gojek.link)              |
 * | notifyClose           | CLOSE                 | Tombol kembali atau MAX_ATTEMPTS_EXCEEDED |
 */
export interface WebViewBridgeProtocol {
  /**
   * Notify app bahwa pembayaran berhasil.
   *
   * Ref: ADR-007 §8
   *
   * Aplikasi akan:
   * 1. Tutup WebView
   * 2. GET /bookings/{booking_id} untuk konfirmasi status
   *
   * @param bookingId - ID booking yang sudah dibayar
   */
  notifyPaymentDone(bookingId: string): void;

  /**
   * Notify app bahwa waktu pembayaran habis.
   *
   * Ref: ADR-007 §8
   *
   * Aplikasi akan:
   * 1. Tutup WebView
   * 2. Tampilkan layar expired
   *
   * @param bookingId - ID booking yang expired
   */
  notifyPaymentExpired(bookingId: string): void;

  /**
   * Notify app bahwa handoff/session tidak valid (perlu kode baru).
   *
   * Ref: ADR-007 §8
   *
   * Terjadi saat:
   * - Exchange return 401
   * - Halaman dimuat ulang (session di memori hilang)
   * - Session tidak valid
   *
   * Aplikasi akan:
   * 1. Request kode baru (POST /payments/{id}/handoff)
   * 2. Muat ulang WebView dengan URL baru
   *
   * @param bookingId - ID booking yang perlu handoff ulang
   */
  notifyHandoffExpired(bookingId: string): void;

  /**
   * Request app untuk membuka URL eksternal (GoPay deeplink).
   *
   * Ref: ADR-007 §8
   *
   * WebView dikunci ke satu domain (PAYMENT_WEB_URL), jadi external links
   * seperti gojek.link harus dibuka via aplikasi mobile.
   *
   * Aplikasi akan:
   * 1. Validasi URL (hanya domain yang diizinkan)
   * 2. Buka URL di browser atau app lain
   *
   * @param bookingId - ID booking terkait
   * @param url - URL eksternal yang akan dibuka (e.g., gojek.link/...)
   */
  requestOpenExternal(bookingId: string, url: string): void;

  /**
   * Notify app bahwa user mau menutup WebView.
   *
   * Ref: ADR-007 §8
   *
   * Terjadi saat:
   * - User tap tombol kembali
   * - User tap tombol hasil (setelah pembayaran)
   * - MAX_ATTEMPTS_EXCEEDED
   *
   * Aplikasi akan:
   * 1. Tutup WebView
   * 2. GET /bookings/{booking_id} untuk cek status terakhir
   *
   * @param bookingId - ID booking terkait
   */
  notifyClose(bookingId: string): void;
}
