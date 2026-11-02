/**
 * Payment order Zod schemas - API Contracts v2.1
 *
 * Parse and validate API responses for payment module
 */

import { z } from "zod";
import type {
  AvailableMethod,
  BankCode,
  Order,
  OrderItem,
  OrderStatus,
  PaymentInstruction,
  PaymentMethod,
  PaymentStatusResult,
  PaymentTtl,
} from "../domain/order.model";

// =============================================================================
// Base Type Schemas
// =============================================================================

const bankCodeSchema = z.enum(["bca", "bni", "bri", "cimb"]) satisfies z.ZodType<BankCode>;

const paymentMethodSchema = z.enum(["bank_transfer", "gopay"]) satisfies z.ZodType<PaymentMethod>;

const orderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "AWAITING_PAYMENT",
  "PENDING_CANCELLATION",
  "PAID",
  "FAILED",
  "EXPIRED",
]) satisfies z.ZodType<OrderStatus>;

// =============================================================================
// Payment Instruction Schema (discriminated union)
// =============================================================================

const instructionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bank_transfer"),
    bank: bankCodeSchema,
    vaNumber: z.string(),
  }),
  z.object({
    type: z.literal("gopay"),
    qrUrl: z.string(),
    deeplinkUrl: z.string(),
  }),
]) satisfies z.ZodType<PaymentInstruction>;

// =============================================================================
// Order Item Schema
// =============================================================================

const orderItemSchema = z.object({
  category: z.string(),
  priceIdr: z.number(),
  nikMasked: z.string(),
}) satisfies z.ZodType<OrderItem>;

// =============================================================================
// Payment TTL Schema
// =============================================================================

const paymentTtlSchema = z.object({
  expiresAt: z.string(),
  ttlSeconds: z.number(),
  serverTime: z.string(),
}) satisfies z.ZodType<PaymentTtl>;

// =============================================================================
// Order Schema (full response)
// =============================================================================

/** Bentuk response order dari GET /bookings/{id} dan POST /payments/{id} */
export const orderSchema = z.object({
  bookingId: z.string(),
  eventName: z.string(),
  items: z.array(orderItemSchema),
  totalIdr: z.number(),
  paymentTtl: paymentTtlSchema,
  status: orderStatusSchema,
  method: paymentMethodSchema.optional(),
  instruction: instructionSchema.optional(),
  attempt: z.number().optional(),
}) satisfies z.ZodType<Order>;

// =============================================================================
// Available Methods Schema (GET /payments/{id}/methods)
// =============================================================================

const bankOptionSchema = z.object({
  code: bankCodeSchema,
  name: z.string(),
  iconUrl: z.string(),
});

export const availableMethodSchema = z.object({
  id: paymentMethodSchema,
  name: z.string(),
  description: z.string(),
  iconUrl: z.string(),
  enabled: z.boolean(),
  banks: z.array(bankOptionSchema).optional(),
}) satisfies z.ZodType<AvailableMethod>;

export const availableMethodsSchema = z.array(availableMethodSchema);

// =============================================================================
// Payment Status Schema (GET /payments/{id}/status polling)
// =============================================================================

export const paymentStatusResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("PENDING"),
    serverTime: z.string(),
    ttlSeconds: z.number(),
  }),
  z.object({
    status: z.literal("PAID"),
    paidAt: z.string(),
    redirectUrl: z.string(),
  }),
  z.object({
    status: z.literal("FAILED"),
    reason: z.string(),
    canRetry: z.boolean(),
    attempt: z.number(),
    paymentExpiresAt: z.string(),
    serverTime: z.string(),
  }),
  z.object({
    status: z.literal("EXPIRED"),
    expiredAt: z.string(),
  }),
]) satisfies z.ZodType<PaymentStatusResult>;
