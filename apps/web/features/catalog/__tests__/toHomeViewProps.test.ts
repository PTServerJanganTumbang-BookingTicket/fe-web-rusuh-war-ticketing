import { describe, expect, it } from "vitest";
import type { Event } from "@rusuh/core";
import { toHomeViewProps } from "../toHomeViewProps";

const event: Event = {
  id: "evt-1",
  name: "Konser A — Jakarta",
  venue: "GBK",
  startsAt: "2026-12-25T12:00:00.000Z",
  status: "on_sale",
  minPriceIdr: 500_000,
};

describe("toHomeViewProps", () => {
  it("ready: daftar kartu event tanpa pesan error", () => {
    const view = toHomeViewProps({ kind: "ready", events: [event] });
    expect(view.events.map((e) => e.name)).toEqual(["Konser A — Jakarta"]);
    expect(view.errorMessage).toBeUndefined();
    expect(view.hero.title).toBe("Energi panggung. Cerita yang kamu bawa pulang.");
  });

  it("failed: daftar kosong dengan pesan error i18n, Home tetap tampil", () => {
    const view = toHomeViewProps({ kind: "failed" });
    expect(view.events).toEqual([]);
    expect(view.errorMessage).toBe("Daftar acara belum bisa dimuat. Coba lagi sebentar lagi.");
  });
});
