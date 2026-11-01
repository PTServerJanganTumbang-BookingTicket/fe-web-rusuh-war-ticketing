import { describe, expect, it } from "vitest";
import type { Order, PaymentMethod, PaymentOutcome } from "../../domain/order.model";
import { createGetOrderUseCase } from "../get-order.use-case";
import type { OrderProtocol } from "../../domain/order.protocol";
import type { PaymentSimulatorProtocol } from "../../domain/payment-simulator.protocol";
import { createSimulatePaymentOutcomeUseCase } from "../simulate-payment-outcome.use-case";
import { createStartPaymentUseCase } from "../start-payment.use-case";

const order: Order = {
  orderId: "RB-1",
  eventName: "Konser A",
  items: [{ name: "VIP", quantity: 1 }],
  totalIdr: 1_500_000,
  expiresAt: "2026-10-19T10:10:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
  status: "awaiting_method",
};

function setupFakes() {
  const calls: unknown[][] = [];
  const orderService: OrderProtocol = {
    get: async (orderId) => {
      calls.push(["get", orderId]);
      return order;
    },
    initiatePayment: async (orderId: string, method: PaymentMethod) => {
      calls.push(["initiatePayment", orderId, method]);
      return { ...order, status: "pending", method };
    },
  };
  const paymentSimulatorService: PaymentSimulatorProtocol = {
    simulate: async (orderId: string, outcome: PaymentOutcome) => {
      calls.push(["simulate", orderId, outcome]);
      return { ...order, status: outcome === "success" ? "paid" : "failed" };
    },
  };
  return { calls, orderService, paymentSimulatorService };
}

describe("use case pembayaran", () => {
  it("createGetOrderUseCase membaca order dari OrderProtocol", async () => {
    const { calls, orderService } = setupFakes();
    expect(await createGetOrderUseCase({ orderService })("RB-1")).toBe(order);
    expect(calls).toEqual([["get", "RB-1"]]);
  });

  it("createStartPaymentUseCase meneruskan metode yang dipilih", async () => {
    const { calls, orderService } = setupFakes();
    const result = await createStartPaymentUseCase({ orderService })("RB-1", "e_wallet");
    expect(result.status).toBe("pending");
    expect(calls).toEqual([["initiatePayment", "RB-1", "e_wallet"]]);
  });

  it("createSimulatePaymentOutcomeUseCase hanya bergantung pada PaymentSimulatorProtocol", async () => {
    const { calls, paymentSimulatorService } = setupFakes();
    const result = await createSimulatePaymentOutcomeUseCase({ paymentSimulatorService })("RB-1", "fail");
    expect(result.status).toBe("failed");
    expect(calls).toEqual([["simulate", "RB-1", "fail"]]);
  });
});
