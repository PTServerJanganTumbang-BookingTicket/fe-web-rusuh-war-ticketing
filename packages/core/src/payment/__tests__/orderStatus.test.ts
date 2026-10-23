import { describe, expect, it } from "vitest";
import type { OrderStatus } from "../../domain/payment";
import { canStartPayment, isPaymentActive, isSettled } from "../orderStatus";

const cases: ReadonlyArray<[OrderStatus, { active: boolean; settled: boolean; start: boolean }]> = [
  ["awaiting_method", { active: true, settled: false, start: true }],
  ["pending", { active: true, settled: false, start: false }],
  ["paid", { active: false, settled: true, start: false }],
  ["failed", { active: false, settled: true, start: false }],
  ["expired", { active: false, settled: true, start: false }],
];

describe("aturan status order", () => {
  it.each(cases)("%s", (status, expected) => {
    expect(isPaymentActive({ status })).toBe(expected.active);
    expect(isSettled({ status })).toBe(expected.settled);
    expect(canStartPayment({ status })).toBe(expected.start);
  });
});
