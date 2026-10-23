import { describe, expect, it } from "vitest";
import { queueProgressPercent } from "../progress";

describe("queueProgressPercent", () => {
  it("0% saat belum bergerak dan 100% saat giliran tiba", () => {
    expect(queueProgressPercent(1248, 1248)).toBe(0);
    expect(queueProgressPercent(1248, 0)).toBe(100);
  });

  it("proporsional di tengah", () => {
    expect(queueProgressPercent(1000, 400)).toBe(60);
  });

  it("tetap dalam rentang 0–100 untuk data aneh", () => {
    expect(queueProgressPercent(100, 150)).toBe(0);
    expect(queueProgressPercent(0, 0)).toBe(100);
  });
});
