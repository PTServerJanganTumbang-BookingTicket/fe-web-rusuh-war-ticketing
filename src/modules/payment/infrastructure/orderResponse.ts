import { z } from "zod";

const instruction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("virtual_account"), bank: z.string(), number: z.string() }),
  z.object({ type: z.literal("qr"), payload: z.string() }),
  z.object({
    type: z.literal("bank_transfer"),
    bank: z.string(),
    account: z.string(),
    accountName: z.string(),
  }),
]);

/** Bentuk response order, dipakai bersama HttpOrderRepository dan HttpPaymentSimulator. */
export const orderResponse = z.object({
  orderId: z.string(),
  eventName: z.string(),
  items: z.array(z.object({ name: z.string(), quantity: z.number() })),
  totalIdr: z.number(),
  expiresAt: z.string(),
  serverNow: z.string(),
  status: z.enum(["awaiting_method", "pending", "paid", "failed", "expired"]),
  method: z.enum(["virtual_account", "e_wallet", "bank_transfer"]).optional(),
  instruction: instruction.optional(),
});
