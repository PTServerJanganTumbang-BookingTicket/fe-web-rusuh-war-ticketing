/**
 * @file order.protocol.ts
 * @description Payment Order Protocol - API Contracts v2.1
 *
 * Requirements: 6.3, 6.11, 6.12, 6.19
 *
 * Endpoints yang didefinisikan:
 *   - GET /bookings/{id}           → getOrder
 *   - GET /payments/{id}/methods   → getAvailableMethods
 *   - POST /payments/{id}          → initiatePayment
 *   - POST /payments/{id}/retry    → retryPayment
 *   - GET /payments/{id}/status    → getPaymentStatus
 *   - GET /events/{id}             → getEvent
 */

import type { AvailableMethod, BankCode, Order, PaymentMethod, PaymentStatusResult } from "./order.model";
import type { PaymentEvent } from "./payment-event.model";

/**
 * Protocol untuk operasi order dan pembayaran.
 *
 * Catatan arsitektur:
 * - OrderUpdatesProtocol (SSE) DIHAPUS untuk payment
 * - Payment status menggunakan polling only — audience adalah 1 orang, bukan 300k (lihat Appendix B)
 * - changePaymentMethod use case DIHAPUS — diganti dengan retryPayment flow:
 *   1. Call retryPayment() → cancel pending transaction → booking returns to HELD
 *   2. retryPayment() juga langsung initiatePayment() dengan metode baru
 */
export interface OrderProtocol {
  /**
   * GET /bookings/{id} - Ambil detail order/booking.
   *
   * @param bookingId - ID booking
   * @returns Order detail lengkap
   */
  getOrder(bookingId: string): Promise<Order>;

  /**
   * GET /payments/{id}/methods - Ambil metode pembayaran yang tersedia.
   *
   * @param bookingId - ID booking
   * @returns Daftar metode dengan status enabled berdasarkan circuit breaker
   */
  getAvailableMethods(bookingId: string): Promise<AvailableMethod[]>;

  /**
   * POST /payments/{id} - Inisiasi pembayaran dengan metode yang dipilih.
   *
   * @param bookingId - ID booking
   * @param method - Metode pembayaran (bank_transfer atau gopay)
   * @param bank - Kode bank (wajib untuk bank_transfer)
   * @returns Order dengan instruksi pembayaran
   */
  initiatePayment(bookingId: string, method: PaymentMethod, bank?: BankCode): Promise<Order>;

  /**
   * POST /payments/{id}/retry - Cancel transaksi lama dan inisiasi ulang dengan metode baru.
   *
   * TTL_Pembayaran tetap dihitung dari waktu booking awal (tidak di-reset).
   *
   * @param bookingId - ID booking
   * @param method - Metode pembayaran baru
   * @param bank - Kode bank (wajib untuk bank_transfer)
   * @returns Order dengan instruksi pembayaran baru
   */
  retryPayment(bookingId: string, method: PaymentMethod, bank?: BankCode): Promise<Order>;

  /**
   * GET /payments/{id}/status - Polling status pembayaran.
   *
   * @param bookingId - ID booking
   * @returns Status pembayaran terkini
   */
  getPaymentStatus(bookingId: string): Promise<PaymentStatusResult>;

  /**
   * GET /events/{id} - Detail event untuk kartu di halaman pembayaran.
   *
   * @param eventId - ID event
   * @returns Detail event untuk tampilan
   */
  getEvent(eventId: string): Promise<PaymentEvent>;
}
