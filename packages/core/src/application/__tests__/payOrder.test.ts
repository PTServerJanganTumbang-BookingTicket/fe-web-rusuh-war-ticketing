import { describe, expect, it, vi } from "vitest";
import { AppFailure } from "../../errors/appError";
import type { Order, OrderStatus } from "../../domain/payment";
import { payOrder } from "../payOrder";

const order = (status: OrderStatus): Order => ({
  orderId: "RB-1",
  eventName: "Konser Rusuh",
  items: [{ name: "VIP", quantity: 1 }],
  totalIdr: 1_500_000,
  expiresAt: "2026-10-22T10:15:00.000Z",
  serverNow: "2026-10-22T10:00:00.000Z",
  status,
});

describe("payOrder", () => {
  it("memulai pembayaran lewat port dan mengembalikan order dari BE", async () => {
    const pending = { ...order("pending"), method: "virtual_account" as const };
    const startPayment = vi.fn().mockResolvedValue(pending);
    await expect(payOrder({ startPayment }, order("awaiting_method"), "virtual_account")).resolves.toBe(pending);
    expect(startPayment).toHaveBeenCalledExactlyOnceWith("RB-1", "virtual_account");
  });

  it.each<OrderStatus>(["pending", "paid", "failed", "expired"])("tidak memulai ulang order berstatus %s", async (status) => {
    const startPayment = vi.fn();
    const current = order(status);
    await expect(payOrder({ startPayment }, current, "e_wallet")).resolves.toBe(current);
    expect(startPayment).not.toHaveBeenCalled();
  });

  it("melempar kegagalan port apa adanya", async () => {
    const failure = new AppFailure({ kind: "api", code: "PAYMENT_EXPIRED", status: 409 });
    const startPayment = vi.fn().mockRejectedValue(failure);
    await expect(payOrder({ startPayment }, order("awaiting_method"), "bank_transfer")).rejects.toBe(failure);
  });
});
