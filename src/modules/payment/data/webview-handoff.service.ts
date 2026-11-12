/**
 * @file webview-handoff.service.ts
 * @description HTTP service untuk WebView payment handoff operations.
 *
 * Requirements: 14.31, 14.32
 * Source: ADR-007 — Serah-Terima Pembayaran dari Aplikasi Mobile ke WebView
 *
 * Endpoints yang dihandle:
 *   - POST /payments/{booking_id}/handoff → requestHandoff (§5.6)
 *   - POST /payments/handoff/exchange     → exchangeHandoffCode (§5.7)
 *
 * Catatan:
 *   - requestHandoff dipanggil oleh mobile app, memerlukan grant headers
 *   - exchangeHandoffCode dipanggil oleh WebView page, TIDAK memakai credentials
 */

import { z } from "zod";
import type { HttpClient, RequestOptions } from "@/core/data/http/http.client";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import { grantHeaders } from "@/core/data/credentials/grant-headers.utils";
import type { WebViewHandoffProtocol } from "../domain/webview-handoff.protocol";
import type { ExchangeResult, HandoffCode, HandoffResult } from "../domain/webview-handoff.model";

/* ========================================================================== */
/*                                 Schemas                                    */
/* ========================================================================== */

/**
 * Response schema untuk POST /payments/{booking_id}/handoff
 *
 * Backend mengirim snake_case, di-transform ke camelCase untuk domain.
 */
const handoffResultSchema = z
  .object({
    handoff_code: z.string(),
    payment_url: z.string().url(),
    expires_at: z.string(),
  })
  .transform((data): HandoffResult => ({
    handoffCode: data.handoff_code,
    paymentUrl: data.payment_url,
    expiresAt: data.expires_at,
  }));

/**
 * Response schema untuk POST /payments/handoff/exchange
 *
 * Backend mengirim snake_case, di-transform ke camelCase untuk domain.
 */
const exchangeResultSchema = z
  .object({
    payment_session: z.string(),
    expires_at: z.string(),
  })
  .transform((data): ExchangeResult => ({
    paymentSession: data.payment_session,
    expiresAt: data.expires_at,
  }));

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

type WebViewHandoffServiceDependencies = {
  readonly httpClient: HttpClient;
  readonly credentialStore: CredentialStoreProtocol;
};

/* ========================================================================== */
/*                              Service Factory                               */
/* ========================================================================== */

/**
 * Membuat HTTP service untuk operasi WebView payment handoff.
 *
 * Alur:
 * 1. Mobile app panggil requestHandoff → dapat handoff_code + payment_url
 * 2. Mobile app buka WebView dengan payment_url
 * 3. WebView page panggil exchangeHandoffCode → dapat payment_session
 * 4. WebView page pakai payment_session untuk API calls selanjutnya
 */
export const createWebViewHandoffService = ({
  httpClient,
  credentialStore,
}: WebViewHandoffServiceDependencies): WebViewHandoffProtocol => {
  /**
   * Membuat request options dengan grant headers untuk mobile app calls.
   */
  const createGrantRequestOptions = (): RequestOptions => ({
    headers: grantHeaders(credentialStore),
    serverErrorCodes: {
      GRANT_TOKEN_INVALID: "GRANT_EXPIRED",
    },
  });

  /**
   * POST /payments/{booking_id}/handoff — Request handoff code.
   *
   * Dipanggil oleh mobile app sebelum membuka WebView.
   * Memerlukan grant headers (X-Grant-Token + X-Device-Id atau Authorization).
   *
   * @param bookingId - ID booking yang akan dibayar
   * @returns HandoffResult berisi code, URL, dan expiry
   */
  const requestHandoff = (bookingId: string): Promise<HandoffResult> => {
    const handoffPath = `/payments/${encodeURIComponent(bookingId)}/handoff`;
    return httpClient.post(handoffPath, {}, handoffResultSchema, createGrantRequestOptions());
  };

  /**
   * POST /payments/handoff/exchange — Tukar handoff code menjadi payment session.
   *
   * Dipanggil oleh WebView page saat pertama kali dimuat.
   * TIDAK memakai grant headers — session menggantikan grant untuk WebView.
   *
   * @param bookingId - ID booking dari URL
   * @param handoffCode - Kode dari URL fragment (#code=...)
   * @returns ExchangeResult berisi payment session dan expiry
   */
  const exchangeHandoffCode = (bookingId: string, handoffCode: HandoffCode): Promise<ExchangeResult> => {
    const exchangePath = "/payments/handoff/exchange";
    const requestBody = {
      booking_id: bookingId,
      handoff_code: handoffCode,
    };

    // TIDAK pakai credentials — exchange endpoint tidak memerlukan grant
    const exchangeOptions: RequestOptions = {
      serverErrorCodes: {
        HANDOFF_CODE_INVALID: "HANDOFF_CODE_INVALID",
        GRANT_TOKEN_INVALID: "GRANT_EXPIRED",
      },
    };

    return httpClient.post(exchangePath, requestBody, exchangeResultSchema, exchangeOptions);
  };

  return {
    requestHandoff,
    exchangeHandoffCode,
  };
};
