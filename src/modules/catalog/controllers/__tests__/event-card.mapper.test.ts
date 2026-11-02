import { describe, expect, it } from "vitest";
import type { Event } from "../../domain/event.model";
import { toEventCardProps } from "../event-card.mapper";

/**
 * Test fixture: Event dengan status AVAILABLE dan queueState OPEN.
 * Sesuai API v2.1 dan event.model.ts:
 * - EventStatus: "AVAILABLE" | "SELLING_OUT_FAST" | "SOLD_OUT"
 * - QueueState: "NOT_OPEN" | "DIRECT" | "OPEN" | "FULL"
 * - display.action menentukan routing: "queue" | "book" | "disabled"
 */
const baseEvent: Event = {
  id: "evt-1",
  name: "Konser A — Jakarta",
  venue: "GBK",
  date: "2026-12-25T12:00:00.000Z",
  imageUrl: "/images/event-1.jpg",
  status: "AVAILABLE",
  queueState: "OPEN",
  display: {
    enabled: true,
    action: "queue",
    labelKey: "home.event.cta",
  },
};

describe("toEventCardProps", () => {
  it("event AVAILABLE dengan action queue: tanggal dan venue, badge AVAILABLE, tombol menuju waiting room", () => {
    const props = toEventCardProps(baseEvent);
    expect(props.date).toBe("25 Des 2026");
    expect(props.venue).toBe("GBK");
    expect(props.statusLabel).toBe("AVAILABLE");
    expect(props.statusTone).toBe("success");
    expect(props.cta).toEqual({ label: "Beli Tiket →", href: "/events/evt-1/queue" });
  });

  it("event AVAILABLE dengan action book (DIRECT): tombol menuju booking langsung", () => {
    const directEvent: Event = {
      ...baseEvent,
      queueState: "DIRECT",
      display: { enabled: true, action: "book", labelKey: "home.event.cta" },
    };
    const props = toEventCardProps(directEvent);
    expect(props.cta).toEqual({ label: "Beli Tiket →", href: "/events/evt-1/book" });
  });

  it("event SOLD_OUT: tombol nonaktif tanpa href", () => {
    const soldOutEvent: Event = {
      ...baseEvent,
      status: "SOLD_OUT",
      queueState: "FULL",
      display: { enabled: false, action: "disabled", labelKey: "home.event.unavailable" },
    };
    const props = toEventCardProps(soldOutEvent);
    expect(props.statusLabel).toBe("SOLD OUT");
    expect(props.cta).toEqual({ label: "Tidak Tersedia" });
    expect(props.statusTone).toBe("danger");
  });

  it("event SELLING_OUT_FAST: badge dengan tone info", () => {
    const sellingOutEvent: Event = {
      ...baseEvent,
      status: "SELLING_OUT_FAST",
    };
    const props = toEventCardProps(sellingOutEvent);
    expect(props.statusLabel).toBe("SELLING OUT");
    expect(props.statusTone).toBe("info");
  });

  it("event NOT_OPEN: tombol nonaktif dengan label sesuai labelKey", () => {
    const notOpenEvent: Event = {
      ...baseEvent,
      status: "AVAILABLE",
      queueState: "NOT_OPEN",
      display: { enabled: false, action: "disabled", labelKey: "home.event.notOpen" },
    };
    const props = toEventCardProps(notOpenEvent);
    expect(props.cta.href).toBeUndefined();
    expect(props.cta.label).toBe("Belum Dibuka");
  });

  it("event QUEUE_FULL: tombol nonaktif dengan label antrian penuh (Req 1.8)", () => {
    const queueFullEvent: Event = {
      ...baseEvent,
      status: "AVAILABLE",
      queueState: "FULL",
      display: {
        enabled: false,
        action: "disabled",
        labelKey: "home.event.queueFull",
        badgeKey: "home.event.badge.queueFull",
      },
    };
    const props = toEventCardProps(queueFullEvent);
    expect(props.cta.href).toBeUndefined();
    expect(props.cta.label).toBe("Antrian Penuh");
    expect(props.statusLabel).toBe("ANTRIAN PENUH");
  });

  it("menggunakan badgeKey dari display jika tersedia", () => {
    const eventWithBadgeKey: Event = {
      ...baseEvent,
      display: {
        ...baseEvent.display,
        badgeKey: "home.event.badge.queueFull",
      },
    };
    const props = toEventCardProps(eventWithBadgeKey);
    expect(props.statusLabel).toBe("ANTRIAN PENUH");
  });

  it("location mengambil bagian pertama dari venue", () => {
    const props = toEventCardProps(baseEvent);
    expect(props.location).toBe("GBK");
    expect(props.category).toBe("LIVE MUSIC");
  });
});
