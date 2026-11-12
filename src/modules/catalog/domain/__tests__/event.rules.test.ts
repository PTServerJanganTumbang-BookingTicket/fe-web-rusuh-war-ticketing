import { describe, expect, it } from "vitest";
import { latestEvents, sortByLatest } from "../event.rules";

const ev = (id: string, date: string, saleStartsAt?: string) => ({ id, date, saleStartsAt });

describe("sortByLatest", () => {
  it("mengurutkan dari penjualan yang paling akhir dibuka", () => {
    const sorted = sortByLatest([
      ev("a", "2026-12-01", "2026-10-01T00:00:00Z"),
      ev("b", "2026-12-01", "2026-11-01T00:00:00Z"),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("tanpa jadwal jual memakai tanggal event, dan mempertahankan urutan awal bila sama", () => {
    const sorted = sortByLatest([ev("a", "2026-12-01"), ev("b", "2026-12-01"), ev("c", "2027-01-01")]);
    expect(sorted.map((e) => e.id)).toEqual(["c", "a", "b"]);
  });

  it("tanggal tak valid ditaruh paling akhir", () => {
    expect(sortByLatest([ev("x", "bad"), ev("y", "2026-12-01")]).map((e) => e.id)).toEqual(["y", "x"]);
  });
});

describe("latestEvents", () => {
  it("membatasi jumlah", () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      ev(`e${i}`, `2026-12-${String(i + 1).padStart(2, "0")}`),
    );
    const result = latestEvents(events, 15);
    expect(result).toHaveLength(15);
    expect(result[0]?.id).toBe("e19");
  });
});
