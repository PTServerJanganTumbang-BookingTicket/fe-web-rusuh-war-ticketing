import { describe, expect, it } from "vitest";
import { pollAfterMs } from "../queue-poll.rules";

const tiers = [
  { maxPosition: 10, pollAfterMs: 1_000 },
  { maxPosition: 100, pollAfterMs: 2_000 },
  { maxPosition: 1_000, pollAfterMs: 5_000 },
  { maxPosition: null, pollAfterMs: 10_000 },
];

describe("pollAfterMs", () => {
  it.each([
    [0, 1_000],
    [10, 1_000],
    [11, 2_000],
    [100, 2_000],
    [101, 5_000],
    [1_000, 5_000],
    [1_001, 10_000],
  ])("posisi %i memakai baris pertama yang memuatnya (%i ms)", (position, expected) => {
    expect(pollAfterMs(position, tiers, 7_000)).toBe(expected);
  });

  it("tanpa tabel memakai nilai cadangan", () => {
    expect(pollAfterMs(50, [], 7_000)).toBe(7_000);
  });

  it("tabel tanpa baris yang cocok memakai nilai cadangan", () => {
    expect(pollAfterMs(500, [{ maxPosition: 10, pollAfterMs: 1_000 }], 7_000)).toBe(7_000);
  });
});
