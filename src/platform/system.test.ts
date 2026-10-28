import { describe, expect, it, vi } from "vitest";
import { MathRandomSource } from "./MathRandomSource";
import { SystemClock } from "./SystemClock";

describe("adapter sistem", () => {
  it("SystemClock membaca Date.now", () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(1234);
    expect(new SystemClock().now()).toBe(1234);
  });

  it("MathRandomSource membaca Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.25);
    expect(new MathRandomSource().next()).toBe(0.25);
  });
});
