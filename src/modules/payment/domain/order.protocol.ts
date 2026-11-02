/**
 * Payment order protocol - API Contracts v2.1
 *
 * Requirements: 6.3, 6.11, 6.12, 6.19
 * Endpoints:
 *   - GET /bookings/{id}           → getOrder
 *   - GET /payments/{id}/methods   → getAvailableMethods  
 *   - POST /payments/{id}          → initiatePayment
 *   - POST /payments/{id}/retry    → retryPayment
 *   - GET /payments/{id}/status    → getPaymentStatus
 */

import type { AvailableMethod, BankCode, Order, PaymentMethod, PaymentStatusResult } from "./order.model";

export interface OrderProtocol {
  /** GET /bookings/{id} - Ambil detail order/booking */
  getOrder(bookingId: string): Promise<Order>;

  /** GET /payments/{id}/methods - Ambil metode pembayaran yang tersedia */
  getAvailableMethods(bookingId: string): Promise<AvailableMethod[]>;

  /** POST /payments/{id} - Inisiasi pembayaran dengan metode yang dipilih */
  initiatePayment(bookingId: string, method: PaymentMethod, bank?: BankCode): Promise<Order>;

  /** POST /payments/{id}/retry - Cancel transaksi lama dan inisiasi ulang dengan metode baru */
  retryPayment(bookingId: string, method: PaymentMethod, bank?: BankCode): Promise<Order>;

  /** GET /payments/{id}/status - Polling status pembayaran */
  getPaymentStatus(bookingId: string): Promise<PaymentStatusResult>;
}

// NOTE: OrderUpdatesProtocol (SSE) REMOVED for payment
// Payment status uses polling only — audience is 1 person, not 300k (see Appendix B)
// NOTE: changePaymentMethod use case REMOVED — replaced by retryPayment flow:
//   1. Call retryPayment() → cancels pending transaction → booking returns to HELD
//   2. Call initiatePayment() with new method
