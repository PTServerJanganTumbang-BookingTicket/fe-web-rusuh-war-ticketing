import { describe, expect, it } from "vitest";
import { canAddTicket } from "./can-add-ticket.rules";

const base = { categoryId: "vip", selection: {}, stock: { vip: 5, reg: 5 }, activeBooked: 0 };

describe("canAddTicket", () => {
  it("boleh menambah bila stok dan kuota tersedia", () => {
    expect(canAddTicket(base)).toBe(true);
  });

  it("menolak bila stok kategori habis", () => {
    expect(canAddTicket({ ...base, stock: { vip: 0 } })).toBe(false);
    expect(canAddTicket({ ...base, selection: { vip: 2 }, stock: { vip: 2 } })).toBe(false);
  });

  it("menolak setelah batas 3 tiket per NIK, lintas kategori", () => {
    expect(canAddTicket({ ...base, selection: { vip: 1, reg: 1 } })).toBe(true);
    expect(canAddTicket({ ...base, selection: { vip: 2, reg: 1 } })).toBe(false);
  });

  it("menghitung booking aktif milik NIK yang sama", () => {
    expect(canAddTicket({ ...base, activeBooked: 2, selection: { reg: 1 } })).toBe(false);
    expect(canAddTicket({ ...base, activeBooked: 2 })).toBe(true);
  });

  it("kategori tanpa data stok dianggap habis", () => {
    expect(canAddTicket({ ...base, categoryId: "unknown" })).toBe(false);
  });
});
