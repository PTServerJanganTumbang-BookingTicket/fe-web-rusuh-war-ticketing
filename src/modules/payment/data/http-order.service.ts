/**
 * HTTP Order Service - API Contracts v2.1
 *
 * Implements OrderProtocol using HTTP endpoints
 * Endpoints:
 *   - GET /bookings/{id}           → getOrder
 *   - GET /payments/{id}/methods   → getAvailableMethods
 *   - POST /payments/{id}          → initiatePayment
 *   - POST /payments/{id}/retry    → retryPayment
 *   - GET /payments/{id}/status    → getPaymentStatus
 */

import type { HttpClient } from "@/core/data/http/http.client";
import type { OrderProtocol } from "../domain/order.protocol";
import type {
  AvailableMethod,
  BankCode,
  Order,
  PaymentMethod,
  PaymentStatusResult,
} from "../domain/order.model";
import { orderSchema, availableMethodsSchema, paymentStatusResultSchema } from "./order.schema";

export function createHttpOrderService({ httpClient }: { httpClient: HttpClient }): OrderProtocol {
  return {
    getOrder(bookingId: string): Promise<Order> {
      return httpClient.get(`/bookings/${encodeURIComponent(bookingId)}`, orderSchema);
    },

    getAvailableMethods(bookingId: string): Promise<AvailableMethod[]> {
      return httpClient.get(`/payments/${encodeURIComponent(bookingId)}/methods`, availableMethodsSchema);
    },

    initiatePayment(bookingId: string, method: PaymentMethod, bank?: BankCode): Promise<Order> {
      const body: { method: PaymentMethod; bank?: BankCode } = { method };
      if (bank) {
        body.bank = bank;
      }
      return httpClient.post(`/payments/${encodeURIComponent(bookingId)}`, body, orderSchema);
    },

    retryPayment(bookingId: string): Promise<Order> {
      return httpClient.post(`/payments/${encodeURIComponent(bookingId)}/retry`, {}, orderSchema);
    },

    getPaymentStatus(bookingId: string): Promise<PaymentStatusResult> {
      return httpClient.get(`/payments/${encodeURIComponent(bookingId)}/status`, paymentStatusResultSchema);
    },
  };
}
