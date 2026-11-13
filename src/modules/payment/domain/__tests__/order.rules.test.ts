import { describe, expect, it } from "vitest";
import type { Order, OrderStatus } from "../order.model";
import {
  canInitiatePayment,
  canRetryPayment,
  hasTimeForRetry,
  isAwaitingConfirmation,
  isAwaitingTickets,
  isFinalOrder,
} from "../order.rules";

const orderWith = (status: OrderStatus): Order => ({
  bookingId: "RB-1",
  eventId: "evt_konser_a",
  eventName: "Konser A",
  items: [],
  totalIdr: 0,
  paymentTtl: {
    expiresAt: "2026-10-19T10:10:00.000Z",
    ttlSeconds: 600,
    serverTime: "2026-10-19T10:00:00.000Z",
  },
  status,
});

describe("order.rules", () => {
  it("isFinalOrder: PAID, FAILED, dan EXPIRED mengakhiri polling", () => {
    for (const status of ["PAID", "FAILED", "EXPIRED"] as const)
      expect(isFinalOrder(orderWith(status))).toBe(true);
    for (const status of ["PENDING_PAYMENT", "AWAITING_PAYMENT", "PENDING_CANCELLATION"] as const)
      expect(isFinalOrder(orderWith(status))).toBe(false);
  });

  it("canRetryPayment: hanya status FAILED", () => {
    expect(canRetryPayment("FAILED")).toBe(true);
    expect(canRetryPayment("PENDING")).toBe(false);
    expect(canRetryPayment("PAID")).toBe(false);
    expect(canRetryPayment("EXPIRED")).toBe(false);
  });

  it("canInitiatePayment: hanya saat PENDING_PAYMENT", () => {
    expect(canInitiatePayment(orderWith("PENDING_PAYMENT"))).toBe(true);
    expect(canInitiatePayment(orderWith("AWAITING_PAYMENT"))).toBe(false);
    expect(canInitiatePayment(orderWith("FAILED"))).toBe(false);
  });

  it("hasTimeForRetry: batas 60 detik, bisa diganti", () => {
    expect(hasTimeForRetry(60)).toBe(true);
    expect(hasTimeForRetry(59)).toBe(false);
    expect(hasTimeForRetry(10, 5)).toBe(true);
    expect(hasTimeForRetry(4, 5)).toBe(false);
  });

  it("isAwaitingConfirmation: menunggu gateway atau masa tenggang", () => {
    expect(isAwaitingConfirmation(orderWith("AWAITING_PAYMENT"))).toBe(true);
    expect(isAwaitingConfirmation(orderWith("PENDING_CANCELLATION"))).toBe(true);
    expect(isAwaitingConfirmation(orderWith("PENDING_PAYMENT"))).toBe(false);
    expect(isAwaitingConfirmation(orderWith("PAID"))).toBe(false);
  });

  it("isAwaitingTickets: PAID dengan kursi tanpa ticketId masih menunggu penerbitan (kontrak §4.4)", () => {
    const seat = { category: "VIP", priceIdr: 1, nikMasked: "3171****22" };
    const paid = (items: Order["items"]): Order => ({ ...orderWith("PAID"), items });
    expect(isAwaitingTickets(paid([seat]))).toBe(true);
    expect(
      isAwaitingTickets(
        paid([{ ...seat, ticketId: "TKT-1", eticketUrl: "/tickets/TKT-1/eticket?t=x" }, seat]),
      ),
    ).toBe(true);
    expect(
      isAwaitingTickets(paid([{ ...seat, ticketId: "TKT-1", eticketUrl: "/tickets/TKT-1/eticket?t=x" }])),
    ).toBe(false);
    // Dicabut: ticketId tanpa eticketUrl sudah final, bukan menunggu.
    expect(isAwaitingTickets(paid([{ ...seat, ticketId: "TKT-1" }]))).toBe(false);
    expect(isAwaitingTickets({ ...orderWith("AWAITING_PAYMENT"), items: [seat] })).toBe(false);
  });
});
