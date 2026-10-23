import { describe, expect, it } from "vitest";
import type { BookingSession } from "../../domain/booking";
import { addTicket, canAddTicketToSession, removeTicket } from "../addTicket";

const session = (overrides: Partial<BookingSession> = {}): BookingSession => ({
  eventName: "Konser Rusuh",
  expiresAt: "2026-10-22T10:10:00.000Z",
  serverNow: "2026-10-22T10:00:00.000Z",
  maskedNik: "3374••••••••0001",
  quota: { max: 3, used: 0, remaining: 3 },
  categories: [
    { id: "vip", name: "VIP", priceIdr: 1_500_000, stock: 12 },
    { id: "festival", name: "Festival", priceIdr: 500_000, stock: 240 },
    { id: "tribune", name: "Tribune", priceIdr: 300_000, stock: 0 },
  ],
  ...overrides,
});

describe("addTicket", () => {
  it("memakai stok dan kuota dari sesi server, bukan dari pemanggil", () => {
    expect(addTicket(session(), {}, "vip")).toEqual({ vip: 1 });
  });

  it("menolak kategori yang stoknya habis", () => {
    const before = {};
    expect(addTicket(session(), before, "tribune")).toBe(before);
    expect(canAddTicketToSession(session(), before, "tribune")).toBe(false);
  });

  it("menghitung booking aktif (quota.used) terhadap batas 3 (ADR-0011)", () => {
    const active = session({ quota: { max: 3, used: 2, remaining: 1 } });
    const one = addTicket(active, {}, "vip");
    expect(one).toEqual({ vip: 1 });
    expect(addTicket(active, one, "festival")).toBe(one);
    expect(canAddTicketToSession(active, one, "festival")).toBe(false);
  });

  it("tidak melebihi stok sebuah kategori", () => {
    const scarce = session({ categories: [{ id: "vip", name: "VIP", priceIdr: 1, stock: 1 }] });
    const one = addTicket(scarce, {}, "vip");
    expect(addTicket(scarce, one, "vip")).toBe(one);
  });

  it("canAddTicketToSession sejalan dengan hasil addTicket", () => {
    const s = session();
    let selection = {};
    for (const id of ["vip", "festival", "vip", "festival"]) {
      const allowed = canAddTicketToSession(s, selection, id);
      const next = addTicket(s, selection, id);
      expect(next !== selection).toBe(allowed);
      selection = next;
    }
  });
});

describe("removeTicket", () => {
  it("mengurangi satu tiket dan berhenti di 0", () => {
    const one = { vip: 1 };
    const none = removeTicket(one, "vip");
    expect(none).toEqual({ vip: 0 });
    expect(removeTicket(none, "vip")).toBe(none);
  });
});
