import { describe, expect, it } from "vitest";
import { formatMmSs } from "./format-mm-ss.utils";

describe("formatMmSs", () => {
  it("memformat menit dan detik", () => {
    expect(formatMmSs(288_000)).toBe("04:48");
    expect(formatMmSs(600_000)).toBe("10:00");
  });

  it("membulatkan ke atas dan tidak negatif", () => {
    expect(formatMmSs(59_001)).toBe("01:00");
    expect(formatMmSs(1)).toBe("00:01");
    expect(formatMmSs(-5)).toBe("00:00");
  });
});
