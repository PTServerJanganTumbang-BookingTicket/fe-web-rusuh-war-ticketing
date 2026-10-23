import { describe, expect, it, vi } from "vitest";
import type { BookingSession, Selection } from "@rusuh/core";
import { toBookingViewProps } from "../toBookingViewProps";

const session: BookingSession = {
  eventName: "Konser A — Jakarta",
  expiresAt: "2026-10-19T10:05:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
  maskedNik: "3171••••••••0001",
  quota: { max: 3, used: 0, remaining: 3 },
  categories: [
    { id: "vip", name: "VIP", priceIdr: 1_500_000, stock: 12 },
    { id: "festival", name: "Festival", priceIdr: 850_000, stock: 240 },
    { id: "tribune", name: "Tribune", priceIdr: 500_000, stock: 0 },
  ],
};

const actions = { add: vi.fn(), remove: vi.fn(), submit: vi.fn(), backToQueue: vi.fn() };

type Selecting = { session?: BookingSession; selection?: Selection; remainingMs?: number };

const build = ({ session: current = session, selection = { vip: 1 }, remainingMs = 288_000 }: Selecting = {}) => {
  const screen = toBookingViewProps({ state: { kind: "selecting", session: current, selection, remainingMs }, actions });
  if (screen.kind !== "ready") throw new Error("harus ready");
  return screen.view;
};

describe("toBookingViewProps: memilih tiket", () => {
  it("memformat countdown, total, dan label stok seperti wireframe", () => {
    const view = build();
    expect(view.headerTimerLabel).toBe("Booking 04:48");
    expect(view.countdown).toMatchObject({ value: "04:48", urgent: false });
    expect(view.total).toEqual({ label: "Total (1 tiket)", value: expect.stringContaining("1.500.000") });
    expect(view.categories.map((c) => c.stockLabel)).toEqual(["Sisa 12", "Sisa 240", "Habis"]);
  });

  it("menampilkan sisa kuota n/3 yang berkurang saat memilih", () => {
    expect(build({ selection: {} }).nik.hint).toContain("sisa 3/3");
    expect(build({ selection: { vip: 1 } }).nik.hint).toContain("sisa 2/3");
    const used = build({ selection: { vip: 1 }, session: { ...session, quota: { max: 3, used: 1, remaining: 2 } } });
    expect(used.nik.hint).toContain("sisa 1/3");
  });

  it("kategori habis tidak bisa ditambah", () => {
    const tribune = build().categories.find((c) => c.id === "tribune");
    expect(tribune).toMatchObject({ soldOut: true, canAdd: false, canRemove: false });
  });

  it("menonaktifkan tambah setelah 3 tiket dan mengaktifkan kurangi", () => {
    const view = build({ selection: { vip: 2, festival: 1 } });
    expect(view.categories.every((c) => !c.canAdd)).toBe(true);
    expect(view.categories.find((c) => c.id === "vip")?.canRemove).toBe(true);
  });

  it("memakai kuota terpakai dari server", () => {
    const view = build({ selection: {}, session: { ...session, quota: { max: 3, used: 3, remaining: 0 } } });
    expect(view.categories.every((c) => !c.canAdd)).toBe(true);
    expect(view.quotaNotice).toBeDefined();
  });

  it("menandai urgent di 60 detik terakhir dan menonaktifkan submit saat habis atau kosong", () => {
    expect(build({ remainingMs: 60_000 }).countdown.urgent).toBe(true);
    expect(build({ remainingMs: 0 }).submit.disabled).toBe(true);
    expect(build({ selection: {} }).submit.disabled).toBe(true);
    expect(build().submit.disabled).toBe(false);
  });

  it("tombol kategori memanggil action dengan id kategori", () => {
    build().categories.find((c) => c.id === "festival")?.onAdd();
    expect(actions.add).toHaveBeenCalledWith("festival");
  });
});

describe("toBookingViewProps: layar status", () => {
  it("loading dan gagal jaringan memakai pesan i18n", () => {
    expect(toBookingViewProps({ state: { kind: "loading" }, actions })).toMatchObject({ kind: "status", view: { tone: "neutral" } });
    expect(toBookingViewProps({ state: { kind: "failed", error: { kind: "network" } }, actions })).toMatchObject({
      kind: "status",
      view: { tone: "error", message: "Koneksi bermasalah. Kami mencoba lagi otomatis." },
    });
  });

  it("expired redirect: pesan mengarahkan, tanpa tombol", () => {
    const screen = toBookingViewProps({ state: { kind: "expired", next: "redirect" }, actions });
    expect(screen.kind === "status" && screen.view.action).toBeUndefined();
  });

  it("expired screen: tombol antre lagi memanggil backToQueue", () => {
    const screen = toBookingViewProps({ state: { kind: "expired", next: "screen" }, actions });
    if (screen.kind !== "status") throw new Error("harus status");
    screen.view.action?.onClick();
    expect(actions.backToQueue).toHaveBeenCalledTimes(1);
  });
});
