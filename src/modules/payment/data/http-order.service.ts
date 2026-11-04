/**
 * HTTP Order Service. Semua endpoint booking dan payment memakai header grant (kontrak: GrantToken, X-Device-Id).
 *   - GET /bookings/{id} + GET /payments/{id}/status → getOrder
 *   - GET /payments/{id}/methods                     → getAvailableMethods
 *   - POST /payments/{id}                            → initiatePayment
 *   - POST /payments/{id}/retry lalu POST /payments  → retryPayment
 *   - GET /payments/{id}/status                      → getPaymentStatus
 */

import { grantHeaders } from "@/core/data/credentials/grant-headers.utils";
import type { HttpClient, RequestOptions } from "@/core/data/http/http.client";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { OrderProtocol } from "../domain/order.protocol";
import type { PaymentEvent } from "../domain/payment-event.model";
import type {
  AvailableMethod,
  BankCode,
  Order,
  PaymentMethod,
  PaymentStatusResult,
} from "../domain/order.model";
import {
  availableMethodsSchema,
  bookingSchema,
  initiatedPaymentSchema,
  paymentEventSchema,
  paymentStatusResultSchema,
  retriedPaymentSchema,
  toOrder,
  type InitiatedPayment,
} from "./order.schema";

export function createHttpOrderService({
  httpClient,
  credentialStore,
}: {
  httpClient: HttpClient;
  credentialStore: CredentialStoreProtocol;
}): OrderProtocol {
  // Instruksi VA/QR hanya dikirim saat pembayaran dimulai; disimpan supaya polling GET tidak menghapusnya.
  const payments = new Map<string, InitiatedPayment>();
  const options = (): RequestOptions => ({ headers: grantHeaders(credentialStore) });
  const paymentPath = (bookingId: string) => `/payments/${encodeURIComponent(bookingId)}`;

  const getPaymentStatus = (bookingId: string): Promise<PaymentStatusResult> =>
    httpClient.get(`${paymentPath(bookingId)}/status`, paymentStatusResultSchema, options());

  async function getOrder(bookingId: string): Promise<Order> {
    const booking = await httpClient.get(
      `/bookings/${encodeURIComponent(bookingId)}`,
      bookingSchema,
      options(),
    );
    if (booking.status !== "PENDING_PAYMENT") return toOrder(booking);
    return toOrder(booking, await getPaymentStatus(bookingId), payments.get(bookingId));
  }

  async function initiatePayment(bookingId: string, method: PaymentMethod, bank?: BankCode): Promise<Order> {
    const body = bank ? { method, bank } : { method };
    const payment = await httpClient.post(paymentPath(bookingId), body, initiatedPaymentSchema, options());
    payments.set(bookingId, payment);
    return getOrder(bookingId);
  }

  return {
    getOrder,
    getPaymentStatus,
    initiatePayment,

    getEvent(eventId: string): Promise<PaymentEvent> {
      return httpClient.get(`/events/${encodeURIComponent(eventId)}`, paymentEventSchema);
    },

    getAvailableMethods(bookingId: string): Promise<AvailableMethod[]> {
      return httpClient.get(`${paymentPath(bookingId)}/methods`, availableMethodsSchema, options());
    },

    // Kontrak: retry hanya membatalkan pembayaran berjalan (booking kembali HELD), lalu metode baru dimulai.
    async retryPayment(bookingId: string, method: PaymentMethod, bank?: BankCode): Promise<Order> {
      await httpClient.post(`${paymentPath(bookingId)}/retry`, {}, retriedPaymentSchema, options());
      payments.delete(bookingId);
      return initiatePayment(bookingId, method, bank);
    },
  };
}
