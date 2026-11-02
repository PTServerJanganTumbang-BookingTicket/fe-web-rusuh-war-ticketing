/**
 * Payment module constants - API Contracts v2.1
 *
 * Requirements: 6.1, 6.7, 6.13, 6.19, BR-05, BR-06
 * Konstanta bisnis untuk modul pembayaran
 */

/** BR-05: TTL_Pembayaran dalam detik — starts from POST /bookings, not from page open */
export const TTL_PAYMENT_SECONDS = 600; // 10 menit

/** BR-10: Grace period dalam detik */
export const GRACE_PERIOD_SECONDS = 30;

/** Polling interval for payment status (no SSE for payment) - Req 6.13 */
export const PAYMENT_STATUS_POLL_INTERVAL_MS = 3_000;

/** Minimum remaining TTL to allow method switch (PAYMENT_WINDOW_CLOSED guard) - Req 6.19 */
export const MIN_RETRY_REMAINING_SECONDS = 60;

/** Maximum payment attempts per booking - BR-06 */
export const MAX_PAYMENT_ATTEMPTS = 3;
