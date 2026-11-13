/**
 * @file http-order.service.ts
 * @description HTTP service untuk order dan payment operations.
 *
 * Endpoints yang dihandle:
 *   - GET /bookings/{id} + GET /payments/{id}/status → getOrder
 *   - GET /payments/{id}/methods                     → getAvailableMethods
 *   - POST /payments/{id}                            → initiatePayment
 *   - POST /payments/{id}/retry                      → retryPayment
 *   - GET /payments/{id}/status                      → getPaymentStatus
 *   - GET /events/{id}                               → getEvent
 *
 * Semua endpoint booking dan payment memerlukan header grant (GrantToken, X-Device-Id). Di WebView pembayaran
 * (ADR-007) header itu diganti satu header `X-Payment-Session`; keduanya tidak pernah dikirim bersamaan
 * (kontrak §5: itu 400 VALIDATION_ERROR).
 */

import { grantHeaders } from "@/core/data/credentials/grant-headers.utils";
import type { HttpClient, RequestOptions } from "@/core/data/http/http.client";
import { toAppError, type ApiErrorCode } from "@/core/domain/app-error";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { OrderProtocol } from "../domain/order.protocol";
import type { PaymentSessionProtocol } from "../domain/payment-session.protocol";
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

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

type HttpOrderServiceDependencies = {
  readonly httpClient: HttpClient;
  readonly credentialStore: CredentialStoreProtocol;
  readonly paymentSessionService: PaymentSessionProtocol;
};

const PAYMENT_ERROR_CODES: Readonly<Record<string, ApiErrorCode>> = {
  BOOKING_STATUS_INVALID: "BOOKING_STATUS_INVALID",
  PAYMENT_WINDOW_CLOSED: "PAYMENT_WINDOW_CLOSED",
  MAX_ATTEMPTS_EXCEEDED: "MAX_ATTEMPTS_EXCEEDED",
  PAYMENT_ALREADY_SETTLED: "PAYMENT_ALREADY_SETTLED",
};

/* ========================================================================== */
/*                              Service Factory                               */
/* ========================================================================== */

/**
 * Membuat HTTP service untuk operasi order dan pembayaran.
 *
 * Instruksi VA/QR hanya dikirim saat pembayaran dimulai (POST /payments),
 * jadi disimpan di client-side cache agar polling GET tidak menghapusnya.
 */
export const createHttpOrderService = ({
  httpClient,
  credentialStore,
  paymentSessionService,
}: HttpOrderServiceDependencies): OrderProtocol => {
  // Cache untuk menyimpan instruksi pembayaran aktif per booking
  const activePaymentsCache = new Map<string, InitiatedPayment>();

  /**
   * Membuat request options. Payment session (WebView) menggantikan grant, bukan menambah: kontrak menolak
   * keduanya sekaligus.
   */
  const createRequestOptions = (): RequestOptions => {
    const session = paymentSessionService.current();
    return { headers: session ? { "x-payment-session": session } : grantHeaders(credentialStore) };
  };

  /**
   * Request options untuk POST charge dan /retry: error bisnis kontrak §5.2-5.3 dipetakan ke kode FE (satu status
   * 409 bisa berarti beberapa hal, jadi lewat meta.error_code), supaya tidak jadi "unknown" yang generik.
   */
  const createPostOptions = (): RequestOptions => ({
    ...createRequestOptions(),
    serverErrorCodes: PAYMENT_ERROR_CODES,
  });

  /**
   * Membuat path untuk endpoint payment.
   */
  const createPaymentPath = (bookingId: string): string => `/payments/${encodeURIComponent(bookingId)}`;

  /**
   * GET /payments/{id}/status - Polling status pembayaran.
   */
  const getPaymentStatus = (bookingId: string): Promise<PaymentStatusResult> => {
    const statusPath = `${createPaymentPath(bookingId)}/status`;
    return httpClient.get(statusPath, paymentStatusResultSchema, createRequestOptions());
  };

  /**
   * GET /bookings/{id} - Ambil detail order/booking.
   * Jika status masih PENDING_PAYMENT, juga ambil payment status.
   */
  const getOrder = async (bookingId: string): Promise<Order> => {
    const bookingPath = `/bookings/${encodeURIComponent(bookingId)}`;
    const booking = await httpClient.get(bookingPath, bookingSchema, createRequestOptions());

    // Booking sudah final atau belum sampai bayar: tidak ada charge hidup, instruksi lama tidak berlaku lagi
    if (booking.status !== "PENDING_PAYMENT") {
      activePaymentsCache.delete(bookingId);
      return toOrder(booking);
    }

    // Ambil payment status dan gabungkan dengan cache instruksi
    const paymentStatus = await getPaymentStatus(bookingId);
    const cachedPayment = activePaymentsCache.get(bookingId);

    // Setelah penolakan (FAILED) atau status akhir, tidak ada transaksi Midtrans yang hidup (kontrak §5.2-5.3).
    // Cache dikosongkan agar bayar berikutnya memanggil POST /payments/{id} langsung, bukan /retry yang 409.
    if (paymentStatus.status !== "PENDING") activePaymentsCache.delete(bookingId);

    return toOrder(booking, paymentStatus, cachedPayment);
  };

  /**
   * POST /payments/{id} - Inisiasi pembayaran dengan metode yang dipilih.
   */
  const charge = async (bookingId: string, method: PaymentMethod, bank?: BankCode): Promise<Order> => {
    const paymentPath = createPaymentPath(bookingId);
    const requestBody = bank != null ? { method, bank } : { method };

    const paymentResult = await httpClient.post(
      paymentPath,
      requestBody,
      initiatedPaymentSchema,
      createPostOptions(),
    );

    // Simpan instruksi ke cache
    activePaymentsCache.set(bookingId, paymentResult);

    // Ambil order terbaru dengan instruksi
    return getOrder(bookingId);
  };

  /**
   * GET /payments/{id}/methods - Ambil metode pembayaran yang tersedia.
   */
  const getAvailableMethods = (bookingId: string): Promise<AvailableMethod[]> => {
    const methodsPath = `${createPaymentPath(bookingId)}/methods`;
    return httpClient.get(methodsPath, availableMethodsSchema, createRequestOptions());
  };

  /**
   * GET /events/{id} - Detail event untuk kartu di halaman pembayaran.
   */
  const getEvent = (eventId: string): Promise<PaymentEvent> => {
    const eventPath = `/events/${encodeURIComponent(eventId)}`;
    return httpClient.get(eventPath, paymentEventSchema);
  };

  /**
   * POST /payments/{id}/retry - Cancel transaksi lama dan inisiasi ulang.
   *
   * Kontrak: retry hanya membatalkan pembayaran berjalan (booking kembali HELD),
   * lalu metode baru dimulai dengan TTL yang sama (tidak di-reset).
   */
  const retryPayment = async (bookingId: string, method: PaymentMethod, bank?: BankCode): Promise<Order> => {
    const retryPath = `${createPaymentPath(bookingId)}/retry`;

    // Cancel pembayaran yang sedang berjalan
    await httpClient.post(retryPath, {}, retriedPaymentSchema, createPostOptions());

    // Hapus instruksi lama dari cache
    activePaymentsCache.delete(bookingId);

    // Inisiasi ulang dengan metode baru
    return charge(bookingId, method, bank);
  };

  /**
   * POST /payments/{id}. Booking yang sudah punya charge berjalan (customer kembali dari halaman booking lalu
   * memilih metode lain) tidak boleh di-charge ulang: server mencoba memutar ulang charge lama dan gagal 500
   * ("could not replay charge"). Charge lama dibatalkan dulu lewat retry. Bila cache instruksi sudah hilang (muat
   * ulang halaman) dan server menjawab 5xx, retry dicoba sekali; galat asli yang dilempar bila retry juga gagal.
   */
  const initiatePayment = async (
    bookingId: string,
    method: PaymentMethod,
    bank?: BankCode,
  ): Promise<Order> => {
    if (activePaymentsCache.has(bookingId)) return retryPayment(bookingId, method, bank);
    try {
      return await charge(bookingId, method, bank);
    } catch (failure) {
      const error = toAppError(failure);
      if (error.kind !== "unknown" || (error.status ?? 0) < 500) throw failure;
      try {
        return await retryPayment(bookingId, method, bank);
      } catch {
        throw failure;
      }
    }
  };

  return {
    getOrder,
    getPaymentStatus,
    initiatePayment,
    getAvailableMethods,
    getEvent,
    retryPayment,
  };
};
