import { describe, expect, it } from "vitest";
import type { Order, PaymentMethod, BankCode } from "../../domain/order.model";
import { createGetOrderUseCase } from "../get-order.use-case";
import type { OrderProtocol } from "../../domain/order.protocol";
import { createStartPaymentUseCase } from "../start-payment.use-case";
import { createWatchOrderUseCase } from "../watch-order.use-case";

const order: Order = {
  bookingId: "RB-1",
  eventId: "evt_konser_a",
  eventName: "Konser A",
  items: [{ category: "VIP", priceIdr: 1_500_000, nikMasked: "3201•••••••0001" }],
  totalIdr: 1_500_000,
  paymentTtl: {
    expiresAt: "2026-10-19T10:10:00.000Z",
    ttlSeconds: 600,
    serverTime: "2026-10-19T10:00:00.000Z",
  },
  status: "PENDING_PAYMENT",
};

function setupFakes() {
  const calls: unknown[][] = [];
  const orderService: OrderProtocol = {
    getOrder: async (bookingId) => {
      calls.push(["getOrder", bookingId]);
      return order;
    },
    getEvent: async (eventId) => {
      calls.push(["getEvent", eventId]);
      return {
        name: "Konser A",
        category: "LIVE MUSIC",
        city: "Jakarta",
        venue: "GBK",
        date: "2026-12-25",
        imageUrl: "",
      };
    },
    getAvailableMethods: async (bookingId) => {
      calls.push(["getAvailableMethods", bookingId]);
      return [
        {
          id: "bank_transfer",
          name: "Bank Transfer",
          description: "VA",
          iconUrl: "",
          enabled: true,
          banks: [],
        },
        { id: "gopay", name: "GoPay", description: "E-Wallet", iconUrl: "", enabled: true },
      ];
    },
    initiatePayment: async (bookingId: string, method: PaymentMethod, bank?: BankCode) => {
      calls.push(["initiatePayment", bookingId, method, bank]);
      return { ...order, status: "AWAITING_PAYMENT" as const, method };
    },
    retryPayment: async (bookingId: string, method: PaymentMethod, bank?: BankCode) => {
      calls.push(["retryPayment", bookingId, method, bank]);
      return { ...order, status: "AWAITING_PAYMENT" as const, method, attempt: 2 };
    },
    getPaymentStatus: async (bookingId: string) => {
      calls.push(["getPaymentStatus", bookingId]);
      return { status: "PENDING" as const, serverTime: "2026-10-19T10:00:00.000Z", ttlSeconds: 600 };
    },
  };
  return { calls, orderService };
}

describe("use case pembayaran v2.1", () => {
  it("createGetOrderUseCase membaca order dari OrderProtocol", async () => {
    const { calls, orderService } = setupFakes();
    expect(await createGetOrderUseCase({ orderService })("RB-1")).toBe(order);
    expect(calls).toEqual([["getOrder", "RB-1"]]);
  });

  it("createStartPaymentUseCase meneruskan metode bank_transfer dengan bank code", async () => {
    const { calls, orderService } = setupFakes();
    const result = await createStartPaymentUseCase({ orderService })({
      bookingId: "RB-1",
      method: "bank_transfer",
      bank: "bca",
    });
    expect(result.status).toBe("AWAITING_PAYMENT");
    expect(calls).toEqual([["initiatePayment", "RB-1", "bank_transfer", "bca"]]);
  });

  it("createStartPaymentUseCase meneruskan metode gopay tanpa bank code", async () => {
    const { calls, orderService } = setupFakes();
    const result = await createStartPaymentUseCase({ orderService })({
      bookingId: "RB-1",
      method: "gopay",
    });
    expect(result.status).toBe("AWAITING_PAYMENT");
    expect(calls).toEqual([["initiatePayment", "RB-1", "gopay", undefined]]);
  });

  it("createWatchOrderUseCase memanggil getPaymentStatus untuk polling", async () => {
    const { calls, orderService } = setupFakes();
    const result = await createWatchOrderUseCase({ orderService })("RB-1");
    expect(result.status).toBe("PENDING");
    expect(calls).toEqual([["getPaymentStatus", "RB-1"]]);
  });
});
