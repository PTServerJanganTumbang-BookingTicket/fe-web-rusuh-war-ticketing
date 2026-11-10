import { describe, expect, it, vi } from "vitest";
import type { Event } from "../../domain/event.model";
import { loadHomeViewProps } from "../home.loader";

const event: Event = {
  id: "evt-1",
  name: "Konser A",
  venue: "GBK",
  date: "2026-12-25T12:00:00.000Z",
  category: "LIVE MUSIC",
  imageUrl: "/images/event-1.jpg",
  status: "AVAILABLE",
  queueState: "OPEN",
  display: { enabled: true, action: "queue", labelKey: "home.event.cta" },
};

describe("loadHomeViewProps", () => {
  it("memetakan event ke kartu dan menyusun navbar, hero, dan footer dari i18n", async () => {
    const listEventsUseCase = vi.fn(() => Promise.resolve([event]));
    const props = await loadHomeViewProps({ listEventsUseCase } as never);
    expect(props.events).toHaveLength(1);
    expect(props.events[0]?.cta).toEqual({ label: "Beli Tiket →", href: "/events/evt-1/queue" });
    expect(props.errorMessage).toBeUndefined();
    expect(props.nav.items.map((item) => item.href)).toEqual(["/", "/tickets", "/help"]);
    expect(props.nav.loginHref).toBe("/login");
    expect(props.hero.headline).toBeTruthy();
  });

  it("daftar kosong tetap dikembalikan tanpa pesan galat", async () => {
    const props = await loadHomeViewProps({ listEventsUseCase: () => Promise.resolve([]) } as never);
    expect(props.events).toEqual([]);
    expect(props.errorMessage).toBeUndefined();
  });

  it("galat saat memuat event menjadi daftar kosong dengan pesan galat", async () => {
    const props = await loadHomeViewProps({
      listEventsUseCase: () => Promise.reject(new Error("BE mati")),
    } as never);
    expect(props.events).toEqual([]);
    expect(props.errorMessage).toBeTruthy();
  });
});
