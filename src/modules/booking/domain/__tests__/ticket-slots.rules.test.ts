import { describe, expect, it } from "vitest";
import { duplicateNikSlots, isEmail, isNikFormat, ticketSlots } from "../ticket-slots.rules";

const categories = [
  { id: "vip", name: "VIP", description: "", priceIdr: 1_500_000, stock: 12 },
  { id: "festival", name: "Festival", description: "", priceIdr: 850_000, stock: 240 },
];

describe("ticketSlots", () => {
  it("satu slot per tiket, urut kategori, nomor berurutan, kunci stabil", () => {
    expect(ticketSlots({ festival: 1, vip: 2 }, categories)).toEqual([
      { key: "vip-0", categoryId: "vip", categoryName: "VIP", priceIdr: 1_500_000, number: 1 },
      { key: "vip-1", categoryId: "vip", categoryName: "VIP", priceIdr: 1_500_000, number: 2 },
      { key: "festival-0", categoryId: "festival", categoryName: "Festival", priceIdr: 850_000, number: 3 },
    ]);
    expect(ticketSlots({}, categories)).toEqual([]);
  });
});

describe("duplicateNikSlots", () => {
  it("menandai semua slot dengan NIK yang sama, mengabaikan yang kosong", () => {
    expect(duplicateNikSlots({ a: "1", b: "2", c: "1", d: "", e: "" })).toEqual(new Set(["a", "c"]));
  });
});

describe("format", () => {
  it.each([
    ["3171000000000022", true],
    ["317100000000002", false],
    ["31710000000000a2", false],
  ])("NIK %s → %s", (nik, expected) => {
    expect(isNikFormat(nik)).toBe(expected);
  });

  it("email", () => {
    expect(isEmail(" rina@example.com ")).toBe(true);
    expect(isEmail("rina@")).toBe(false);
  });
});
