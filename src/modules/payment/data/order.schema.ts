import { z } from "zod";
import type { Order, PaymentInstruction } from "../domain/order.model";

const instructionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("virtual_account"), bank: z.string(), number: z.string() }),
  z.object({ type: z.literal("qr"), payload: z.string() }),
  z.object({
    type: z.literal("bank_transfer"),
    bank: z.string(),
    account: z.string(),
    accountName: z.string(),
  }),
]) satisfies z.ZodType<PaymentInstruction>;

/** Bentuk response order, dipakai bersama HttpOrderService dan HttpPaymentSimulatorService. */
export const orderSchema = z.object({
  orderId: z.string(),
  eventName: z.string(),
  items: z.array(z.object({ name: z.string(), quantity: z.number() })),
  totalIdr: z.number(),
  expiresAt: z.string(),
  serverNow: z.string(),
  status: z.enum(["awaiting_method", "pending", "paid", "failed", "expired"]),
  method: z.enum(["virtual_account", "e_wallet", "bank_transfer"]).optional(),
  instruction: instructionSchema.optional(),
}) satisfies z.ZodType<Order>;
