import { describe, expect, it } from "vitest";
import type { Order, PaymentMethod, PaymentOutcome } from "../domain/order";
import { GetOrder } from "./GetOrder";
import type { OrderRepository } from "./OrderRepository";
import type { PaymentSimulator } from "./PaymentSimulator";
import { SimulatePaymentOutcome } from "./SimulatePaymentOutcome";
import { StartPayment } from "./StartPayment";

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
  const orderRepository: OrderRepository = {
    get: async (orderId) => {
      calls.push(["get", orderId]);
      return order;
    },
    startPayment: async (orderId: string, method: PaymentMethod) => {
      calls.push(["startPayment", orderId, method]);
      return { ...order, status: "pending", method };
    },
  };
  const paymentSimulator: PaymentSimulator = {
    simulate: async (orderId: string, outcome: PaymentOutcome) => {
      calls.push(["simulate", orderId, outcome]);
      return { ...order, status: outcome === "success" ? "paid" : "failed" };
    },
  };
  return { calls, orderRepository, paymentSimulator };
}

describe("use case pembayaran", () => {
  it("GetOrder membaca order dari repository", async () => {
    const { calls, orderRepository } = setupFakes();
    expect(await new GetOrder({ orderRepository }).execute("RB-1")).toBe(order);
    expect(calls).toEqual([["get", "RB-1"]]);
  });

  it("StartPayment meneruskan metode yang dipilih", async () => {
    const { calls, orderRepository } = setupFakes();
    const result = await new StartPayment({ orderRepository }).execute("RB-1", "e_wallet");
    expect(result.status).toBe("pending");
    expect(calls).toEqual([["startPayment", "RB-1", "e_wallet"]]);
  });

  it("SimulatePaymentOutcome hanya bergantung pada PaymentSimulator", async () => {
    const { calls, paymentSimulator } = setupFakes();
    const result = await new SimulatePaymentOutcome({ paymentSimulator }).execute("RB-1", "fail");
    expect(result.status).toBe("failed");
    expect(calls).toEqual([["simulate", "RB-1", "fail"]]);
  });
});
