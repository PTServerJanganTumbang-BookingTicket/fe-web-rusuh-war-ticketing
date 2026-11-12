/**
 * @file webview-bridge.service.ts
 * @description WebView Bridge Service untuk komunikasi ke aplikasi mobile.
 *
 * Requirements: 14.33, BR-32
 * Source: ADR-007 — Serah-Terima Pembayaran dari Aplikasi Mobile ke WebView
 *
 * Service ini adalah wrapper tipis di atas postMessageToApp dari rules.
 * Semua pesan hanyalah sinyal — aplikasi HARUS konfirmasi via GET /bookings/{id}.
 *
 * | Method                | Type di postMessage   | Kapan                                    |
 * |-----------------------|-----------------------|------------------------------------------|
 * | notifyPaymentDone     | PAYMENT_DONE          | /status = PAID                           |
 * | notifyPaymentExpired  | PAYMENT_EXPIRED       | /status = EXPIRED atau PAYMENT_WINDOW_CLOSED |
 * | notifyHandoffExpired  | HANDOFF_EXPIRED       | Exchange 401, reload, atau session invalid |
 * | requestOpenExternal   | OPEN_EXTERNAL         | GoPay deeplink (gojek.link)              |
 * | notifyClose           | CLOSE                 | Tombol kembali atau MAX_ATTEMPTS_EXCEEDED |
 */

import type { WebViewBridgeProtocol } from "../domain/webview-handoff.protocol";
import { postMessageToApp } from "../domain/webview-handoff.rules";

/* ========================================================================== */
/*                              Service Factory                               */
/* ========================================================================== */

/**
 * Membuat WebView Bridge Service untuk komunikasi ke aplikasi mobile.
 *
 * Service ini mengimplementasikan WebViewBridgeProtocol dengan mengirim pesan
 * via window.ReactNativeWebView.postMessage(). postMessageToApp sudah handle:
 * - SSR-safe (tidak error di server)
 * - WebView detection (tidak kirim jika bukan di WebView)
 *
 * ADR-007 §8: Pesan dari WebView hanyalah sinyal. Aplikasi selalu memastikan
 * lewat GET /bookings/{booking_id}. Yang menentukan lunas tetap webhook.
 *
 * @returns WebViewBridgeProtocol implementation
 */
export const createWebViewBridgeService = (): WebViewBridgeProtocol => {
  /**
   * Notify app bahwa pembayaran berhasil.
   *
   * Aplikasi akan:
   * 1. Tutup WebView
   * 2. GET /bookings/{booking_id} untuk konfirmasi status
   * 3. Tampilkan tiket bila status = PAID
   *
   * @param bookingId - ID booking yang sudah dibayar
   */
  const notifyPaymentDone = (bookingId: string): void => {
    postMessageToApp({ type: "PAYMENT_DONE", bookingId });
  };

  /**
   * Notify app bahwa waktu pembayaran habis.
   *
   * Dipanggil saat:
   * - /status = EXPIRED
   * - PAYMENT_WINDOW_CLOSED
   * - Exchange menjawab 401 GRANT_TOKEN_INVALID
   *
   * Aplikasi akan:
   * 1. Tutup WebView
   * 2. GET /bookings/{booking_id}
   * 3. Tampilkan layar expired
   *
   * @param bookingId - ID booking yang expired
   */
  const notifyPaymentExpired = (bookingId: string): void => {
    postMessageToApp({ type: "PAYMENT_EXPIRED", bookingId });
  };

  /**
   * Notify app bahwa handoff/session tidak valid (perlu kode baru).
   *
   * Dipanggil saat:
   * - Exchange menjawab 401 HANDOFF_CODE_INVALID
   * - Halaman dimuat ulang (session di memori hilang)
   * - Setiap 401 PAYMENT_SESSION_INVALID
   *
   * Aplikasi akan:
   * 1. Minta kode baru (POST /payments/{id}/handoff)
   * 2. Muat ulang WebView dengan URL baru
   *
   * @param bookingId - ID booking yang perlu handoff ulang
   */
  const notifyHandoffExpired = (bookingId: string): void => {
    postMessageToApp({ type: "HANDOFF_EXPIRED", bookingId });
  };

  /**
   * Request app untuk membuka URL eksternal (GoPay deeplink).
   *
   * WebView dikunci ke satu domain (PAYMENT_WEB_URL), jadi external links
   * seperti gojek.link harus dibuka via aplikasi mobile dengan Linking.openURL.
   *
   * Aplikasi akan:
   * 1. Validasi URL (hanya domain yang diizinkan)
   * 2. Buka URL dengan Linking.openURL
   *
   * @param bookingId - ID booking terkait
   * @param url - URL eksternal yang akan dibuka (e.g., gojek.link/...)
   */
  const requestOpenExternal = (bookingId: string, url: string): void => {
    postMessageToApp({ type: "OPEN_EXTERNAL", bookingId, url });
  };

  /**
   * Notify app bahwa user mau menutup WebView.
   *
   * Dipanggil saat:
   * - User tap tombol kembali
   * - User tap tombol hasil (setelah pembayaran)
   * - MAX_ATTEMPTS_EXCEEDED
   *
   * Aplikasi akan:
   * 1. Tutup WebView
   * 2. GET /bookings/{booking_id} untuk cek status terakhir
   * 3. Tampilkan layar sesuai status
   *
   * @param bookingId - ID booking terkait
   */
  const notifyClose = (bookingId: string): void => {
    postMessageToApp({ type: "CLOSE", bookingId });
  };

  return {
    notifyPaymentDone,
    notifyPaymentExpired,
    notifyHandoffExpired,
    requestOpenExternal,
    notifyClose,
  };
};
