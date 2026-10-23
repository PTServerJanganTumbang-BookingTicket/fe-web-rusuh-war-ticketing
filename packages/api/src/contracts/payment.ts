import { z } from "zod";

const paymentMethod = z.enum(["virtual_account", "e_wallet", "bank_transfer"]);

const instruction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("virtual_account"), bank: z.string(), number: z.string() }),
  z.object({ type: z.literal("qr"), payload: z.string() }),
  z.object({ type: z.literal("bank_transfer"), bank: z.string(), account: z.string(), accountName: z.string() }),
]);

// KONTRAK-ASUMSI: GET /orders/{orderId}, POST /orders/{orderId}/payment
export const orderResponse = z.object({
  orderId: z.string(),
  eventName: z.string(),
  items: z.array(z.object({ name: z.string(), quantity: z.number() })),
  totalIdr: z.number(),
  expiresAt: z.string(),
  serverNow: z.string(),
  status: z.enum(["awaiting_method", "pending", "paid", "failed", "expired"]),
  method: paymentMethod.optional(),
  instruction: instruction.optional(),
});

// KONTRAK-ASUMSI: POST /orders/{orderId}/payment
export const startPaymentRequest = z.object({ method: paymentMethod });

// Hanya mock (MSW): POST /mock/orders/{orderId}/outcome
export const paymentOutcomeRequest = z.object({ outcome: z.enum(["success", "fail"]) });

export type OrderResponseDto = z.output<typeof orderResponse>;
export type PaymentInstructionDto = z.output<typeof instruction>;
export type StartPaymentRequestDto = z.input<typeof startPaymentRequest>;
export type PaymentOutcomeRequestDto = z.input<typeof paymentOutcomeRequest>;
