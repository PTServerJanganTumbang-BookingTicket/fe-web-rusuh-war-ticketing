/**
 * @file order.rules.ts
 * @description Payment Order Business Rules - API Contracts v2.1
 *
 * Requirements: 6.7, 6.8, 6.19
 * Pure functions untuk validasi state order dan transisi pembayaran.
 */

import type { Order, PaymentStatusResult } from "./order.model";
import { MIN_RETRY_REMAINING_SECONDS } from "./payment.constants";

/* ========================================================================== */
/*                            Terminal State Check                            */
/* ========================================================================== */

/**
 * Mengecek apakah order dalam status akhir (polling berhenti).
 *
 * Requirements: 6.7 (TTL expired → final)
 *
 * @param order - Order yang akan dicek
 * @returns true jika order sudah final (PAID, FAILED, atau EXPIRED)
 */
export const isFinalOrder = (order: Order): boolean => {
  // SELECTING ikut berhenti: customer dialihkan ke halaman booking, tidak ada yang perlu di-poll di sini.
  const terminalStatuses = ["PAID", "FAILED", "EXPIRED", "SELECTING"];
  return terminalStatuses.includes(order.status);
};

/* ========================================================================== */
/*                              Retry Eligibility                             */
/* ========================================================================== */

/**
 * Mengecek apakah customer bisa retry pembayaran (ganti metode).
 *
 * Requirements: 6.19 (retry saat FAILED)
 *
 * @param status - Status dari polling result
 * @returns true jika bisa retry (status FAILED)
 */
export const canRetryPayment = (status: PaymentStatusResult["status"]): boolean => {
  return status === "FAILED";
};

/* ========================================================================== */
/*                          Payment Initiation Check                          */
/* ========================================================================== */

/**
 * Mengecek apakah customer bisa initiate pembayaran baru.
 *
 * Requirements: 6.3 (initiate payment flow)
 * Hanya saat order masih PENDING_PAYMENT (belum pernah bayar atau setelah retry).
 *
 * @param order - Order yang akan dicek
 * @returns true jika bisa initiate pembayaran baru
 */
export const canInitiatePayment = (order: Order): boolean => {
  return order.status === "PENDING_PAYMENT";
};

/* ========================================================================== */
/*                             Time-based Checks                              */
/* ========================================================================== */

/**
 * Mengecek apakah masih ada waktu untuk ganti metode pembayaran.
 *
 * Requirements: 6.19 (PAYMENT_WINDOW_CLOSED guard)
 * Tolak jika sisa waktu < MIN_RETRY_REMAINING_SECONDS (60s).
 *
 * @param ttlSeconds - Sisa waktu dalam detik
 * @param minRemaining - Minimum waktu yang harus tersisa (default: 60s)
 * @returns true jika masih ada waktu untuk retry
 */
export const hasTimeForRetry = (
  ttlSeconds: number,
  minRemaining: number = MIN_RETRY_REMAINING_SECONDS,
): boolean => {
  return ttlSeconds >= minRemaining;
};

/* ========================================================================== */
/*                         Awaiting Confirmation Check                        */
/* ========================================================================== */

/**
 * Mengecek apakah order dalam status menunggu konfirmasi gateway.
 *
 * UI akan menampilkan "verifying..." jika true.
 *
 * @param order - Order yang akan dicek
 * @returns true jika sedang menunggu konfirmasi gateway
 */
export const isAwaitingConfirmation = (order: Order): boolean => {
  const awaitingStatuses = ["AWAITING_PAYMENT", "PENDING_CANCELLATION"];
  return awaitingStatuses.includes(order.status);
};

/* ========================================================================== */
/*                           Ticket Issuance Check                            */
/* ========================================================================== */

/**
 * PAID tetapi masih ada kursi tanpa `ticketId`: tiket belum diterbitkan (kontrak §4.4).
 * Kursi yang punya `ticketId` tanpa `eticketUrl` (dicabut atau kedaluwarsa) sudah final, bukan menunggu.
 */
export const isAwaitingTickets = (order: Order): boolean =>
  order.status === "PAID" && order.items.some((item) => item.ticketId == null);
