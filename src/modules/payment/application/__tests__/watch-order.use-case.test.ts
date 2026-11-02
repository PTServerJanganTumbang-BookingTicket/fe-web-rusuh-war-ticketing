import { describe, expect, it, vi } from "vitest";
import { createWatchOrderUseCase } from "../watch-order.use-case";
import type { PaymentStatusResult } from "../../domain/order.model";
import type { OrderProtocol } from "../../domain/order.protocol";

describe("createWatchOrderUseCase", () => {
  it("memanggil getPaymentStatus dan mengembalikan PaymentStatusResult", async () => {
    const expectedResult: PaymentStatusResult = {
      status: "PENDING",
      serverTime: "2026-10-19T10:00:00.000Z",
      ttlSeconds: 600,
    };

    const orderService = {
      getPaymentStatus: vi.fn().mockResolvedValue(expectedResult),
    } as unknown as OrderProtocol;

    const watchOrder = createWatchOrderUseCase({ orderService });
    const result = await watchOrder("RB-1");

    expect(orderService.getPaymentStatus).toHaveBeenCalledWith("RB-1");
    expect(result).toBe(expectedResult);
  });

  it("mengembalikan status PAID dengan redirectUrl", async () => {
    const paidResult: PaymentStatusResult = {
      status: "PAID",
      paidAt: "2026-10-19T10:05:00.000Z",
      redirectUrl: "/confirmation/RB-1",
    };

    const orderService = {
      getPaymentStatus: vi.fn().mockResolvedValue(paidResult),
    } as unknown as OrderProtocol;

    const watchOrder = createWatchOrderUseCase({ orderService });
    const result = await watchOrder("RB-1");

    expect(result).toEqual(paidResult);
  });

  it("mengembalikan status FAILED dengan canRetry info", async () => {
    const failedResult: PaymentStatusResult = {
      status: "FAILED",
      reason: "Insufficient balance",
      canRetry: true,
      attempt: 1,
      paymentExpiresAt: "2026-10-19T10:10:00.000Z",
      serverTime: "2026-10-19T10:05:00.000Z",
    };

    const orderService = {
      getPaymentStatus: vi.fn().mockResolvedValue(failedResult),
    } as unknown as OrderProtocol;

    const watchOrder = createWatchOrderUseCase({ orderService });
    const result = await watchOrder("RB-1");

    expect(result).toEqual(failedResult);
  });
});
