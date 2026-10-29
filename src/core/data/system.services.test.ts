import { describe, expect, it, vi } from "vitest";
import { MathRandomService } from "./math-random.service";
import { SystemClockService } from "./system-clock.service";

describe("service sistem", () => {
  it("SystemClockService membaca Date.now", () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(1234);
    expect(new SystemClockService().now()).toBe(1234);
  });

  it("MathRandomService membaca Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.25);
    expect(new MathRandomService().next()).toBe(0.25);
  });
});
