import { describe, expect, it } from "vitest";
import type { Order } from "@rusuh/core";
import { derivePaymentScreenState, type PaymentScreenInput } from "../paymentModel";

const order: Order = {
  orderId: "RB-1",
  eventName: "Konser A",
  items: [{ name: "VIP", quantity: 1 }],
  totalIdr: 1_500_000,
  expiresAt: "2026-10-19T10:10:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
  status: "awaiting_method",
};

const input = (overrides: Partial<PaymentScreenInput>): PaymentScreenInput => ({
  order: undefined,
  error: undefined,
  remainingMs: null,
  method: "virtual_account",
  submitting: false,
  copied: false,
  simulation: undefined,
  ...overrides,
});

describe("derivePaymentScreenState", () => {
  it("tanpa order: loading, atau failed bila ada error", () => {
    expect(derivePaymentScreenState(input({}))).toEqual({ kind: "loading" });
    expect(derivePaymentScreenState(input({ error: { kind: "network" } }))).toEqual({ kind: "failed", error: { kind: "network" } });
  });

  it.each(["paid", "failed", "expired"] as const)("status %s dari server: settled", (status) => {
    expect(derivePaymentScreenState(input({ order: { ...order, status } }))).toEqual({ kind: "settled", order: { ...order, status } });
  });

  it("order aktif: paying, timer yang belum siap dianggap 0", () => {
    expect(derivePaymentScreenState(input({ order }))).toEqual({
      kind: "paying",
      order,
      remainingMs: 0,
      method: "virtual_account",
      submitting: false,
      copied: false,
    });
  });

  it("kontrol simulasi hanya ada bila diberikan (mode mock)", () => {
    expect(derivePaymentScreenState(input({ order, remainingMs: 1000, simulation: { busy: true } }))).toMatchObject({
      kind: "paying",
      simulation: { busy: true },
    });
  });
});
