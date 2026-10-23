import { describe, expect, it } from "vitest";
import { orderResponse } from "../../contracts/payment";
import { toOrder, toPaymentOutcomeRequest, toStartPaymentRequest } from "../payment";

const base = {
  orderId: "RB-1",
  eventName: "Konser A",
  items: [{ name: "VIP", quantity: 1 }],
  totalIdr: 1_500_000,
  expiresAt: "2026-10-19T10:10:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
};

describe("toOrder", () => {
  it("order tanpa metode tidak membawa method dan instruction", () => {
    const order = toOrder(orderResponse.parse({ ...base, status: "awaiting_method" }));
    expect(order).toEqual({ ...base, status: "awaiting_method" });
    expect(order).not.toHaveProperty("instruction");
  });

  it.each([
    [{ type: "virtual_account", bank: "BCA", number: "8277" }],
    [{ type: "qr", payload: "rusuh-pay:RB-1" }],
    [{ type: "bank_transfer", bank: "BCA", account: "123", accountName: "PT Rusuh" }],
  ])("memetakan instruksi %o", (instruction) => {
    const order = toOrder(orderResponse.parse({ ...base, status: "pending", method: "virtual_account", instruction }));
    expect(order.instruction).toEqual(instruction);
  });
});

describe("request body pembayaran", () => {
  it("dibentuk mapper", () => {
    expect(toStartPaymentRequest("e_wallet")).toEqual({ method: "e_wallet" });
    expect(toPaymentOutcomeRequest("fail")).toEqual({ outcome: "fail" });
  });
});
