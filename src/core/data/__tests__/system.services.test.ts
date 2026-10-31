import { describe, expect, it, vi } from "vitest";
import { createMathRandomService } from "../math-random.service";
import { createSystemClockService } from "../system-clock.service";

describe("service sistem", () => {
  it("SystemClockService membaca Date.now", () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(1234);
    expect(createSystemClockService().now()).toBe(1234);
  });

  it("MathRandomService membaca Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.25);
    expect(createMathRandomService().next()).toBe(0.25);
  });
});
