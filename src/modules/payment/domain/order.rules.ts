/**
 * Payment order business rules - API Contracts v2.1
 *
 * Requirements: 6.7, 6.8, 6.19
 * Pure functions untuk validasi state order dan transisi pembayaran
 */

import type { Order, PaymentStatusResult } from "./order.model";
import { MIN_RETRY_REMAINING_SECONDS } from "./payment.constants";

/**
 * Status akhir order; polling berhenti.
 * Requirements: 6.7 (TTL expired → final)
 */
export function isFinalOrder(order: Order): boolean {
  return order.status === "PAID" || order.status === "FAILED" || order.status === "EXPIRED";
}

/**
 * Apakah customer bisa retry pembayaran (ganti metode).
 * Retry allowed hanya jika status FAILED dari polling.
 * Requirements: 6.19 (retry saat FAILED)
 */
export function canRetryPayment(status: PaymentStatusResult["status"]): boolean {
  return status === "FAILED";
}

/**
 * Apakah customer bisa initiate pembayaran baru.
 * Hanya saat order masih PENDING_PAYMENT (belum pernah bayar atau setelah retry).
 * Requirements: 6.3 (initiate payment flow)
 */
export function canInitiatePayment(order: Order): boolean {
  return order.status === "PENDING_PAYMENT";
}

/**
 * Apakah masih ada waktu untuk ganti metode pembayaran.
 * Tolak jika sisa waktu < MIN_RETRY_REMAINING_SECONDS (60s).
 * Requirements: 6.19 (PAYMENT_WINDOW_CLOSED guard)
 */
export function hasTimeForRetry(
  ttlSeconds: number,
  minRemaining: number = MIN_RETRY_REMAINING_SECONDS,
): boolean {
  return ttlSeconds >= minRemaining;
}

/**
 * Apakah order dalam status menunggu konfirmasi gateway.
 * Tampilkan UI "verifying..." jika true.
 */
export function isAwaitingConfirmation(order: Order): boolean {
  return order.status === "AWAITING_PAYMENT" || order.status === "PENDING_CANCELLATION";
}
