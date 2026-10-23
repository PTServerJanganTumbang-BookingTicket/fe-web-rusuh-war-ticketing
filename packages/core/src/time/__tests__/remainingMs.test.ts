import { describe, expect, it } from "vitest";
import { remainingMs, serverOffsetMs } from "../remainingMs";

const expiresAt = "2026-10-19T10:10:00.000Z";
const t = (iso: string) => Date.parse(iso);

describe("remainingMs", () => {
  it("menghitung dari expiresAt tanpa offset", () => {
    expect(remainingMs(expiresAt, t("2026-10-19T10:00:00.000Z"), 0)).toBe(600_000);
  });

  it("offset positif (server lebih cepat) memperpendek sisa waktu", () => {
    const offset = serverOffsetMs(t("2026-10-19T10:00:05.000Z"), t("2026-10-19T10:00:00.000Z"));
    expect(offset).toBe(5_000);
    expect(remainingMs(expiresAt, t("2026-10-19T10:00:00.000Z"), offset)).toBe(595_000);
  });

  it("offset negatif (server lebih lambat) memperpanjang sisa waktu", () => {
    expect(remainingMs(expiresAt, t("2026-10-19T10:00:00.000Z"), -5_000)).toBe(605_000);
  });

  it("tab tertidur: sisa waktu mengikuti jam, bukan hitungan tick", () => {
    expect(remainingMs(expiresAt, t("2026-10-19T10:09:30.000Z"), 0)).toBe(30_000);
  });

  it("tidak pernah negatif dan expiresAt tidak valid dianggap habis", () => {
    expect(remainingMs(expiresAt, t("2026-10-19T11:00:00.000Z"), 0)).toBe(0);
    expect(remainingMs("bukan-tanggal", 0, 0)).toBe(0);
  });
});
