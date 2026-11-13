/**
 * @file order.schema.ts
 * @description Zod schemas untuk payment module.
 * Bentuk mengikuti kontrak API (snake_case), lalu dipetakan ke model domain (camelCase).
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

/* ========================================================================== */
/*                              Base Schemas                                  */
/* ========================================================================== */

/** Schema untuk kode bank yang didukung */
const bankCodeSchema = z.enum(["bca", "bni", "bri", "cimb"]) satisfies z.ZodType<BankCode>;

/** Schema untuk metode pembayaran */
const paymentMethodSchema = z.enum(["bank_transfer", "gopay"]) satisfies z.ZodType<PaymentMethod>;

/**
 * Schema untuk instruksi pembayaran dari API.
 * Kontrak tidak punya diskriminator, bentuk ditentukan oleh `method`.
 */
const paymentInstructionsSchema = z.union([
  z.object({
    bank: bankCodeSchema,
    va_number: z.string(),
  }),
  z.object({
    qr_url: z.string(),
    deeplink_url: z.string(),
  }),
]);

/* ========================================================================== */
/*                           Transform Functions                              */
/* ========================================================================== */

type ApiInstructions = z.infer<typeof paymentInstructionsSchema>;

/**
 * Mengubah instruksi API ke domain model.
 */
const transformInstructionsToDomain = (instructions: ApiInstructions): PaymentInstruction => {
  // Virtual Account (Bank Transfer)
  if ("va_number" in instructions) {
    return {
      type: "bank_transfer",
      bank: instructions.bank,
      vaNumber: instructions.va_number,
    };
  }

  // QR Code (GoPay)
  return {
    type: "gopay",
    qrUrl: instructions.qr_url,
    deeplinkUrl: instructions.deeplink_url,
  };
};

/* ========================================================================== */
/*                      Booking Schema (GET /bookings/{id})                   */
/* ========================================================================== */

/**
 * Schema untuk TTL pembayaran.
 *
 * Note: ttl_seconds dihapus dari API v2.15. Jika tidak ada, dihitung dari expires_at - server_time.
 */
const paymentTtlSchema = z
  .object({
    expires_at: z.string(),
    ttl_seconds: z.number().optional(),
    server_time: z.string(),
  })
  .transform((ttl): PaymentTtl => {
    // Calculate ttlSeconds from expires_at and server_time if not provided (API v2.15+)
    const calculatedTtl = Math.max(
      0,
      Math.floor((Date.parse(ttl.expires_at) - Date.parse(ttl.server_time)) / 1000),
    );
    return {
      expiresAt: ttl.expires_at,
      ttlSeconds: ttl.ttl_seconds ?? calculatedTtl,
      serverTime: ttl.server_time,
    };
  });

/**
 * Schema untuk response booking.
 * Booking belum bayar membawa `payment_ttl`; booking PAID membawa `paid_at`.
 */
export const bookingSchema = z
  .object({
    booking_id: z.string(),
    status: z.enum(["SELECTING", "PENDING_PAYMENT", "PENDING_CANCELLATION", "PAID", "EXPIRED"]),
    event: z.object({
      id: z.string(),
      name: z.string(),
    }),
    tickets: z.array(
      z.object({
        category: z.string(),
        price: z.number(),
        nik_masked: z.string(),
      }),
    ),
    summary: z.object({
      total: z.number(),
    }),
    payment_ttl: paymentTtlSchema.optional(),
    paid_at: z.string().optional(),
  })
  .transform((booking) => {
    const paidAtFallback = booking.paid_at ?? "";

    // Map tickets ke domain items
    const orderItems = booking.tickets.map((ticket) => ({
      category: ticket.category,
      priceIdr: ticket.price,
      nikMasked: ticket.nik_masked,
    }));

    // Default TTL untuk booking yang sudah dibayar (tidak ada countdown)
    const defaultTtl: PaymentTtl = {
      expiresAt: paidAtFallback,
      ttlSeconds: 0,
      serverTime: paidAtFallback,
    };

    return {
      bookingId: booking.booking_id,
      eventId: booking.event.id,
      status: booking.status,
      eventName: booking.event.name,
      items: orderItems,
      totalIdr: booking.summary.total,
      paymentTtl: booking.payment_ttl ?? defaultTtl,
    };
  });

/** DTO type untuk booking response */
export type BookingDto = z.infer<typeof bookingSchema>;

/* ========================================================================== */
/*               Payment Schemas (POST /payments/{booking_id})                */
/* ========================================================================== */

/**
 * Schema untuk response inisiasi pembayaran.
 */
export const initiatedPaymentSchema = z
  .object({
    method: paymentMethodSchema,
    instructions: paymentInstructionsSchema,
  })
  .transform((payment) => ({
    method: payment.method,
    instruction: transformInstructionsToDomain(payment.instructions),
  }));

/** Type untuk pembayaran yang sudah diinisiasi */
export type InitiatedPayment = z.infer<typeof initiatedPaymentSchema>;

/**
 * Schema untuk response retry pembayaran.
 * Transforms snake_case API response to camelCase domain type.
 */
export const retriedPaymentSchema = z
  .object({
    booking_id: z.string(),
    status: z.literal("HELD"),
    attempt: z.number(),
    cancelled_order_id: z.string(),
    payment_expires_at: z.string(),
    server_time: z.string(),
  })
  .transform((result) => ({
    bookingId: result.booking_id,
    status: result.status,
    attempt: result.attempt,
    cancelledOrderId: result.cancelled_order_id,
    paymentExpiresAt: result.payment_expires_at,
    serverTime: result.server_time,
  }));

/** Type untuk hasil retry pembayaran */
export type RetriedPayment = z.infer<typeof retriedPaymentSchema>;

/* ========================================================================== */
/*          Available Methods Schema (GET /payments/{booking_id}/methods)     */
/* ========================================================================== */

/**
 * Schema untuk response daftar metode pembayaran yang tersedia.
 */
export const availableMethodsSchema = z
  .object({
    methods: z.array(
      z.object({
        id: paymentMethodSchema,
        name: z.string(),
        description: z.string(),
        icon_url: z.string(),
        enabled: z.boolean(),
        banks: z
          .array(
            z.object({
              code: bankCodeSchema,
              name: z.string(),
              icon_url: z.string(),
            }),
          )
          .optional(),
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
      banks: method.banks?.map((bank) => ({
        code: bank.code,
        name: bank.name,
        iconUrl: bank.icon_url,
      })),
    })),
  );

/* ========================================================================== */
/*          Payment Status Schema (GET /payments/{booking_id}/status)         */
/* ========================================================================== */

/**
 * Schema untuk response status pembayaran (polling).
 * Menggunakan discriminated union berdasarkan field `status`.
 */
export const paymentStatusResultSchema = z
  .discriminatedUnion("status", [
    // PENDING - masih menunggu pembayaran
    // Note: ttl_seconds dihapus dari API v2.15
    z.object({
      status: z.literal("PENDING"),
      server_time: z.string(),
      ttl_seconds: z.number().optional(),
    }),

    // PAID - pembayaran berhasil
    z.object({
      status: z.literal("PAID"),
      paid_at: z.string(),
      redirect_url: z.string(),
    }),

    // FAILED - pembayaran gagal
    z.object({
      status: z.literal("FAILED"),
      reason: z.string(),
      can_retry: z.boolean(),
      attempt: z.number(),
      payment_expires_at: z.string(),
      server_time: z.string(),
    }),

    // EXPIRED - waktu habis (kontrak belum beri contoh, pakai server_time)
    z.object({
      status: z.literal("EXPIRED"),
      server_time: z.string(),
    }),
  ])
  .transform((result): PaymentStatusResult => {
    switch (result.status) {
      case "PENDING":
        return {
          status: "PENDING",
          serverTime: result.server_time,
          ttlSeconds: result.ttl_seconds ?? 0,
        };

      case "PAID":
        return {
          status: "PAID",
          paidAt: result.paid_at,
          redirectUrl: result.redirect_url,
        };

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
        return {
          status: "EXPIRED",
          expiredAt: result.server_time,
        };
    }
  });

/* ========================================================================== */
/*                         Order Transformation                               */
/* ========================================================================== */

/**
 * Menentukan status order berdasarkan booking, status pembayaran, dan pembayaran aktif.
 */
const determineOrderStatus = (
  booking: BookingDto,
  paymentStatus: PaymentStatusResult | undefined,
  activePayment: InitiatedPayment | undefined,
): OrderStatus => {
  // Booking sudah final (PAID/EXPIRED)
  if (booking.status !== "PENDING_PAYMENT") {
    return booking.status;
  }

  // Ada status polling dan bukan PENDING
  if (paymentStatus != null && paymentStatus.status !== "PENDING") {
    return paymentStatus.status;
  }

  // Ada payment aktif = sedang menunggu konfirmasi gateway
  if (activePayment != null) {
    return "AWAITING_PAYMENT";
  }

  // Default: belum bayar
  return "PENDING_PAYMENT";
};

/**
 * Mengubah booking DTO + status pembayaran + pembayaran aktif ke domain Order.
 *
 * Kontrak tidak mengembalikan instruksi lewat GET, jadi instruksi hanya ada
 * setelah POST /payments (disimpan di client-side cache).
 */
export const toOrder = (
  booking: BookingDto,
  paymentStatus?: PaymentStatusResult,
  activePayment?: InitiatedPayment,
): Order => {
  const orderStatus = determineOrderStatus(booking, paymentStatus, activePayment);

  // Base order dari booking
  let order: Order = {
    ...booking,
    status: orderStatus,
  };

  // Update TTL dari status PENDING (tidak return, lanjut ke cek instruction)
  if (paymentStatus?.status === "PENDING") {
    order = {
      ...order,
      paymentTtl: {
        ...order.paymentTtl,
        serverTime: paymentStatus.serverTime,
        ttlSeconds: paymentStatus.ttlSeconds,
      },
    };
  }

  // FAILED: tambahkan attempt info dan return
  if (paymentStatus?.status === "FAILED") {
    return {
      ...order,
      method: activePayment?.method,
      attempt: paymentStatus.attempt,
    };
  }

  // AWAITING_PAYMENT dengan instruksi aktif
  if (orderStatus === "AWAITING_PAYMENT" && activePayment != null) {
    return {
      ...order,
      method: activePayment.method,
      instruction: activePayment.instruction,
    };
  }

  return order;
};

/* ========================================================================== */
/*                   Event Schema (GET /events/{event_id})                    */
/* ========================================================================== */

/**
 * Schema untuk response event detail (hanya bagian yang dipakai kartu event).
 */
export const paymentEventSchema = z
  .object({
    name: z.string(),
    category: z.string(),
    location: z.object({
      venue: z.string(),
      city: z.string(),
    }),
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
