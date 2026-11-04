/**
 * Payment Zod schemas. Bentuk mengikuti kontrak (`data` dalam snake_case), lalu dipetakan ke model domain.
 */

import { z } from "zod";
import type {
  AvailableMethod,
  BankCode,
  Order,
  OrderStatus,
  PaymentInstruction,
  PaymentMethod,
  PaymentStatusResult,
  PaymentTtl,
} from "../domain/order.model";
import type { PaymentEvent } from "../domain/payment-event.model";

const bankCodeSchema = z.enum(["bca", "bni", "bri", "cimb"]) satisfies z.ZodType<BankCode>;

const paymentMethodSchema = z.enum(["bank_transfer", "gopay"]) satisfies z.ZodType<PaymentMethod>;

/** `instructions` kontrak tidak punya diskriminator; bentuknya ditentukan `method`. */
const instructionsSchema = z.union([
  z.object({ bank: bankCodeSchema, va_number: z.string() }),
  z.object({ qr_url: z.string(), deeplink_url: z.string() }),
]);

function toInstruction(instructions: z.infer<typeof instructionsSchema>): PaymentInstruction {
  if ("va_number" in instructions)
    return { type: "bank_transfer", bank: instructions.bank, vaNumber: instructions.va_number };
  return { type: "gopay", qrUrl: instructions.qr_url, deeplinkUrl: instructions.deeplink_url };
}

// =============================================================================
// Booking (GET /bookings/{booking_id})
// =============================================================================

const ttlSchema = z
  .object({ expires_at: z.string(), ttl_seconds: z.number(), server_time: z.string() })
  .transform((ttl): PaymentTtl => ({
    expiresAt: ttl.expires_at,
    ttlSeconds: ttl.ttl_seconds,
    serverTime: ttl.server_time,
  }));

/** Booking belum bayar membawa `payment_ttl`; booking PAID membawa `paid_at`. */
export const bookingSchema = z
  .object({
    booking_id: z.string(),
    status: z.enum(["PENDING_PAYMENT", "PAID", "EXPIRED"]),
    event: z.object({ id: z.string(), name: z.string() }),
    tickets: z.array(z.object({ category: z.string(), price: z.number(), nik_masked: z.string() })),
    summary: z.object({ total: z.number() }),
    payment_ttl: ttlSchema.optional(),
    paid_at: z.string().optional(),
  })
  .transform((booking) => {
    const paidAt = booking.paid_at ?? "";
    return {
      bookingId: booking.booking_id,
      eventId: booking.event.id,
      status: booking.status,
      eventName: booking.event.name,
      items: booking.tickets.map((ticket) => ({
        category: ticket.category,
        priceIdr: ticket.price,
        nikMasked: ticket.nik_masked,
      })),
      totalIdr: booking.summary.total,
      // Booking yang sudah dibayar tidak punya TTL lagi; countdown tidak ditampilkan untuk status akhir.
      paymentTtl: booking.payment_ttl ?? { expiresAt: paidAt, ttlSeconds: 0, serverTime: paidAt },
    };
  });

export type BookingDto = z.infer<typeof bookingSchema>;

// =============================================================================
// Payment (POST /payments/{booking_id}, POST /payments/{booking_id}/retry)
// =============================================================================

export const initiatedPaymentSchema = z
  .object({ method: paymentMethodSchema, instructions: instructionsSchema })
  .transform((payment) => ({ method: payment.method, instruction: toInstruction(payment.instructions) }));

export type InitiatedPayment = z.infer<typeof initiatedPaymentSchema>;

export const retriedPaymentSchema = z.object({ attempt: z.number() });

// =============================================================================
// Available Methods (GET /payments/{booking_id}/methods)
// =============================================================================

export const availableMethodsSchema = z
  .object({
    methods: z.array(
      z.object({
        id: paymentMethodSchema,
        name: z.string(),
        description: z.string(),
        icon_url: z.string(),
        enabled: z.boolean(),
        banks: z.array(z.object({ code: bankCodeSchema, name: z.string(), icon_url: z.string() })).optional(),
      }),
    ),
  })
  .transform(({ methods }): AvailableMethod[] =>
    methods.map((method) => ({
      id: method.id,
      name: method.name,
      description: method.description,
      iconUrl: method.icon_url,
      enabled: method.enabled,
      banks: method.banks?.map((bank) => ({ code: bank.code, name: bank.name, iconUrl: bank.icon_url })),
    })),
  );

// =============================================================================
// Payment Status (GET /payments/{booking_id}/status)
// =============================================================================

export const paymentStatusResultSchema = z
  .discriminatedUnion("status", [
    z.object({ status: z.literal("PENDING"), server_time: z.string(), ttl_seconds: z.number() }),
    z.object({ status: z.literal("PAID"), paid_at: z.string(), redirect_url: z.string() }),
    z.object({
      status: z.literal("FAILED"),
      reason: z.string(),
      can_retry: z.boolean(),
      attempt: z.number(),
      payment_expires_at: z.string(),
      server_time: z.string(),
    }),
    // Kontrak belum memberi contoh EXPIRED; waktu server dipakai sebagai waktu kedaluwarsa.
    z.object({ status: z.literal("EXPIRED"), server_time: z.string() }),
  ])
  .transform((result): PaymentStatusResult => {
    switch (result.status) {
      case "PENDING":
        return { status: "PENDING", serverTime: result.server_time, ttlSeconds: result.ttl_seconds };
      case "PAID":
        return { status: "PAID", paidAt: result.paid_at, redirectUrl: result.redirect_url };
      case "FAILED":
        return {
          status: "FAILED",
          reason: result.reason,
          canRetry: result.can_retry,
          attempt: result.attempt,
          paymentExpiresAt: result.payment_expires_at,
          serverTime: result.server_time,
        };
      case "EXPIRED":
        return { status: "EXPIRED", expiredAt: result.server_time };
    }
  });

function orderStatusOf(
  booking: BookingDto,
  status: PaymentStatusResult | undefined,
  payment: InitiatedPayment | undefined,
): OrderStatus {
  if (booking.status !== "PENDING_PAYMENT") return booking.status;
  if (status && status.status !== "PENDING") return status.status;
  return payment ? "AWAITING_PAYMENT" : "PENDING_PAYMENT";
}

/**
 * Order domain dari booking, status pembayaran, dan pembayaran yang terakhir dimulai di tab ini.
 * Kontrak tidak mengembalikan instruksi lewat GET, jadi instruksi hanya ada setelah `POST /payments`.
 */
export function toOrder(
  booking: BookingDto,
  status?: PaymentStatusResult,
  payment?: InitiatedPayment,
): Order {
  const order: Order = { ...booking, status: orderStatusOf(booking, status, payment) };
  if (status?.status === "PENDING")
    order.paymentTtl = { ...order.paymentTtl, serverTime: status.serverTime, ttlSeconds: status.ttlSeconds };
  if (status?.status === "FAILED") return { ...order, method: payment?.method, attempt: status.attempt };
  if (order.status !== "AWAITING_PAYMENT" || !payment) return order;
  return { ...order, method: payment.method, instruction: payment.instruction };
}

/** `data` dari `GET /events/{event_id}`, hanya bagian yang dipakai kartu event. */
export const paymentEventSchema = z
  .object({
    name: z.string(),
    category: z.string(),
    location: z.object({ venue: z.string(), city: z.string() }),
    date: z.string(),
    image_url: z.string(),
  })
  .transform((event): PaymentEvent => ({
    name: event.name,
    category: event.category,
    city: event.location.city,
    venue: event.location.venue,
    date: event.date,
    imageUrl: event.image_url,
  }));
