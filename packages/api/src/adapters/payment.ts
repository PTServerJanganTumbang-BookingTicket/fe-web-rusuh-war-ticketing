import { z } from "zod";
import type { Order, PaymentMethod, PaymentOutcome } from "@rusuh/core";
import { apiFetch } from "../http/client";

const instruction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("virtual_account"), bank: z.string(), number: z.string() }),
  z.object({ type: z.literal("qr"), payload: z.string() }),
  z.object({ type: z.literal("bank_transfer"), bank: z.string(), account: z.string(), accountName: z.string() }),
]);

const orderResponse = z.object({
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

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export function getOrder(orderId: string): Promise<Order> {
  return apiFetch(`/orders/${encodeURIComponent(orderId)}`, orderResponse);
}

export function startPayment(orderId: string, method: PaymentMethod): Promise<Order> {
  return apiFetch(`/orders/${encodeURIComponent(orderId)}/payment`, orderResponse, post({ method }));
}

/** Hanya ada di mock (MSW). Menggantikan callback Midtrans lewat BE untuk keperluan demo dan test. */
export function emulatePaymentOutcome(orderId: string, outcome: PaymentOutcome): Promise<Order> {
  return apiFetch(`/mock/orders/${encodeURIComponent(orderId)}/outcome`, orderResponse, post({ outcome }));
}
