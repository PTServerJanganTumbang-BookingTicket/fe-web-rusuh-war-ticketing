import { describe, expect, it, vi } from "vitest";
import type { Order } from "../../domain/order.model";
import type { OrderProtocol } from "../../domain/order.protocol";
import { createGetAvailableMethodsUseCase } from "../get-available-methods.use-case";
import { createGetPaymentEventUseCase } from "../get-payment-event.use-case";
import { createRetryPaymentUseCase } from "../retry-payment.use-case";
import { createSimulatePaymentUseCase } from "../simulate-payment.use-case";

const order = { bookingId: "RB-1" } as Order;

function fakeOrderService() {
  return {
    getAvailableMethods: vi.fn(() => Promise.resolve([])),
    getEvent: vi.fn(() => Promise.resolve({ name: "Konser A" })),
    retryPayment: vi.fn(() => Promise.resolve(order)),
  } as unknown as OrderProtocol & {
    getAvailableMethods: ReturnType<typeof vi.fn>;
    getEvent: ReturnType<typeof vi.fn>;
    retryPayment: ReturnType<typeof vi.fn>;
  };
}

describe("use case payment yang meneruskan ke protocol", () => {
  it("getAvailableMethods meneruskan bookingId", async () => {
    const orderService = fakeOrderService();
    await expect(createGetAvailableMethodsUseCase({ orderService })("RB-1")).resolves.toEqual([]);
    expect(orderService.getAvailableMethods).toHaveBeenCalledWith("RB-1");
  });

  it("getPaymentEvent meneruskan eventId", async () => {
    const orderService = fakeOrderService();
    await createGetPaymentEventUseCase({ orderService })("evt_konser_a");
    expect(orderService.getEvent).toHaveBeenCalledWith("evt_konser_a");
  });

  it("retryPayment meneruskan booking, metode, dan bank", async () => {
    const orderService = fakeOrderService();
    await expect(
      createRetryPaymentUseCase({ orderService })({
        bookingId: "RB-1",
        method: "bank_transfer",
        bank: "bni",
      }),
    ).resolves.toBe(order);
    expect(orderService.retryPayment).toHaveBeenCalledWith("RB-1", "bank_transfer", "bni");
  });

  it("simulatePayment meneruskan booking dan outcome ke simulator", async () => {
    const settle = vi.fn(() => Promise.resolve());
    await createSimulatePaymentUseCase({ paymentSimulatorService: { settle } })("RB-1", "FAILED");
    expect(settle).toHaveBeenCalledWith("RB-1", "FAILED");
  });
});
