/**
 * @file handle-webview-handoff.use-case.ts
 * @description Handle WebView Handoff Use Case — Exchange handoff code dan manage payment session
 *
 * Requirements: 14.32, 14.35
 * Source: ADR-007 — Serah-Terima Pembayaran dari Aplikasi Mobile ke WebView
 *
 * Use case ini dipanggil saat halaman `/m/orders/{booking_id}/pay` pertama kali dimuat:
 * 1. Extract `#code=` dari URL fragment (fragment tidak masuk log server)
 * 2. Validasi format sebelum request ke server
 * 3. Hapus code dari URL segera menggunakan history.replaceState (mencegah bocor di browser history)
 * 4. Exchange code via POST /payments/handoff/exchange
 * 5. Return payment session (disimpan di memori oleh caller, BUKAN di localStorage per BR-27)
 */

import type { ApiErrorCode } from "@/core/domain/app-error";
import { toAppError } from "@/core/domain/app-error";

import type { WebViewHandoffProtocol } from "../domain/webview-handoff.protocol";
import {
  extractHandoffCodeFromFragment,
  isValidHandoffCode,
  removeCodeFromUrl,
} from "../domain/webview-handoff.rules";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/**
 * Result dari operasi handoff exchange.
 *
 * Discriminated union dengan 3 error cases:
 * - NO_CODE: URL fragment tidak mengandung handoff code
 * - INVALID_CODE: Format handoff code tidak valid (bukan hc_{64 hex})
 * - EXCHANGE_FAILED: Server menolak exchange (code expired, sudah dipakai, dll)
 */
export type WebViewHandoffResult =
  | { readonly success: true; readonly paymentSession: string }
  | {
      readonly success: false;
      readonly error: "NO_CODE" | "INVALID_CODE" | "EXCHANGE_FAILED";
      readonly errorCode?: ApiErrorCode;
    };

/**
 * Use case type untuk handle WebView handoff.
 *
 * Dipanggil saat Payment Page pertama kali dimuat di WebView.
 */
export type HandleWebViewHandoffUseCase = (bookingId: string) => Promise<WebViewHandoffResult>;

type HandleWebViewHandoffDependencies = {
  readonly webViewHandoffService: WebViewHandoffProtocol;
};

/* ========================================================================== */
/*                              Use Case Factory                              */
/* ========================================================================== */

/**
 * Membuat use case untuk handle WebView handoff.
 *
 * ADR-007 §2–§4:
 * - Handoff code sekali pakai, berlaku 60 detik, terikat ke satu booking_id
 * - Payment session hanya di memori halaman (bukan localStorage, cookie, atau URL)
 * - Session hidup selama grant hidup
 *
 * @param deps - Dependencies yang dibutuhkan (WebViewHandoffProtocol)
 * @returns HandleWebViewHandoffUseCase function
 */
export function createHandleWebViewHandoffUseCase({
  webViewHandoffService,
}: HandleWebViewHandoffDependencies): HandleWebViewHandoffUseCase {
  return async (bookingId: string): Promise<WebViewHandoffResult> => {
    // Step 1: Extract code dari URL fragment
    // ADR-007 §1: Fragment tidak dikirim ke server, jadi aman dari logging
    const handoffCode = extractHandoffCodeFromFragment();

    if (!handoffCode) {
      return { success: false, error: "NO_CODE" };
    }

    // Step 2: Validasi format code
    // ADR-007 §2: Format hc_{64 hex} (256 bit)
    if (!isValidHandoffCode(handoffCode)) {
      return { success: false, error: "INVALID_CODE" };
    }

    // Step 3: Hapus code dari URL segera (mencegah bocor di history)
    // ADR-007 §1: Menggunakan history.replaceState untuk keamanan
    removeCodeFromUrl();

    try {
      // Step 4: Exchange code untuk payment session
      // ADR-007 §5.7: POST /payments/handoff/exchange
      const result = await webViewHandoffService.exchangeHandoffCode(bookingId, handoffCode);

      // Step 5: Return payment session
      // ADR-007 §6: Payment session disimpan di memori, BUKAN localStorage (BR-27)
      // Caller bertanggung jawab menyimpan session di memori JS
      return { success: true, paymentSession: result.paymentSession };
    } catch (error: unknown) {
      const appError = toAppError(error);

      if (appError.kind === "api") {
        return {
          success: false,
          error: "EXCHANGE_FAILED",
          errorCode: appError.code,
        };
      }

      return { success: false, error: "EXCHANGE_FAILED" };
    }
  };
}
