/**
 * @file payment-session.protocol.ts
 * @description Penyimpan payment session WebView (ADR-007 §6, BR-27).
 *
 * Session hanya hidup di memori halaman: bukan localStorage, cookie, atau URL. Muat ulang berarti session hilang
 * dan aplikasi diminta mengirim kode baru.
 */

import type { PaymentSession } from "./webview-handoff.model";

export interface PaymentSessionProtocol {
  /** Session aktif, atau `null` bila halaman bukan WebView atau belum menukar kode. */
  current(): PaymentSession | null;
  /** Simpan hasil exchange; `null` melepasnya (mis. 401 PAYMENT_SESSION_INVALID). */
  set(session: PaymentSession | null): void;
}
