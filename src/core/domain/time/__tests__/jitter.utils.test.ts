import { describe, expect, it } from "vitest";
import { withJitter } from "../jitter.utils";

describe("withJitter", () => {
  it("berada dalam ±20% dari interval dasar", () => {
    expect(withJitter(5000, 0)).toBe(4000);
    expect(withJitter(5000, 0.5)).toBe(5000);
    expect(withJitter(5000, 0.999999)).toBe(6000);
  });
});
