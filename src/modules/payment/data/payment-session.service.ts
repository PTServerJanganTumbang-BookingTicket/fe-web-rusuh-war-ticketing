/**
 * @file payment-session.service.ts
 * @description Penyimpan payment session di memori JS (ADR-007 §6, BR-27). Tidak menyentuh storage apa pun.
 */

import type { PaymentSessionProtocol } from "../domain/payment-session.protocol";
import type { PaymentSession } from "../domain/webview-handoff.model";

export const createPaymentSessionService = (): PaymentSessionProtocol => {
  let session: PaymentSession | null = null;
  return {
    current: () => session,
    set: (next) => {
      session = next;
    },
  };
};
