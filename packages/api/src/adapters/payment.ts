import type { Order, PaymentMethod, PaymentOutcome } from "@rusuh/core";
import { orderResponse } from "../contracts/payment";
import { apiFetch } from "../http/client";
import { toOrder, toPaymentOutcomeRequest, toStartPaymentRequest } from "../mappers/payment";

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export async function getOrder(orderId: string): Promise<Order> {
  return toOrder(await apiFetch(`/orders/${encodeURIComponent(orderId)}`, orderResponse));
}

export async function startPayment(orderId: string, method: PaymentMethod): Promise<Order> {
  return toOrder(await apiFetch(`/orders/${encodeURIComponent(orderId)}/payment`, orderResponse, post(toStartPaymentRequest(method))));
}

/** Hanya ada di mock (MSW). Menggantikan callback Midtrans lewat BE untuk keperluan demo dan test. */
export async function emulatePaymentOutcome(orderId: string, outcome: PaymentOutcome): Promise<Order> {
  return toOrder(await apiFetch(`/mock/orders/${encodeURIComponent(orderId)}/outcome`, orderResponse, post(toPaymentOutcomeRequest(outcome))));
}
