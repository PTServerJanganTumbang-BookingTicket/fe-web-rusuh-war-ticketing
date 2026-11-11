import { describe, expect, it } from "vitest";
import type { Event } from "../../domain/event.model";
import { toEventCardProps } from "../event-card.mapper";

/**
 * Test fixture: Event dengan status AVAILABLE dan queueState OPEN.
 * Sesuai API v2.1 dan event.model.ts:
 * - EventStatus: "AVAILABLE" | "SELLING_OUT_FAST" | "SOLD_OUT"
 * - QueueState: "SCHEDULED" | "OPEN" | "QUEUE_FULL" | "FULL_BOOKED" | "CLOSED"
 * - display.action menentukan routing: "queue" | "book" | "disabled"
 */
const baseEvent: Event = {
  id: "evt-1",
  name: "Konser A — Jakarta",
  venue: "GBK",
  date: "2026-12-25T12:00:00.000Z",
  category: "LIVE MUSIC",
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
    expect(props.cta).toEqual({ label: "Beli Tiket", href: "/events/evt-1/queue" });
  });

  it("event AVAILABLE dengan action book (DIRECT): tombol menuju booking langsung", () => {
    const directEvent: Event = {
      ...baseEvent,
      queueState: "OPEN",
      display: { enabled: true, action: "book", labelKey: "home.event.cta" },
    };
    const props = toEventCardProps(directEvent);
    expect(props.cta).toEqual({ label: "Beli Tiket", href: "/events/evt-1/book" });
  });

  it("event SOLD_OUT: tombol nonaktif tanpa href", () => {
    const soldOutEvent: Event = {
      ...baseEvent,
      status: "SOLD_OUT",
      queueState: "QUEUE_FULL",
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
      queueState: "SCHEDULED",
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
      queueState: "QUEUE_FULL",
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

describe("toEventCardProps: kondisi tombol dan chip (kontrak §2.1)", () => {
  const disabled = (labelKey: string, badgeKey?: string): Event["display"] => ({
    enabled: false,
    action: "disabled",
    labelKey,
    badgeKey,
  });

  it("belum dibuka: tombol 'Buka <waktu absolut>' dan chip BELUM DIBUKA bernada info", () => {
    const props = toEventCardProps({
      ...baseEvent,
      queueState: "SCHEDULED",
      saleStartsAt: "2026-11-10T02:00:00Z",
      display: disabled("home.event.notOpen", "home.event.badge.notOpen"),
    });
    expect(props.cta).toEqual({ label: "Buka 10 Nov 09:00" });
    expect(props.statusLabel).toBe("BELUM DIBUKA");
    expect(props.statusTone).toBe("info");
  });

  it("belum dibuka tanpa jadwal: tombol memakai label umum", () => {
    const props = toEventCardProps({ ...baseEvent, display: disabled("home.event.notOpen") });
    expect(props.cta).toEqual({ label: "Belum Dibuka" });
  });

  it("antrian penuh: chip ANTRIAN PENUH bernada peringatan walau stok masih ada", () => {
    const props = toEventCardProps({
      ...baseEvent,
      queueState: "QUEUE_FULL",
      display: disabled("home.event.queueFull", "home.event.badge.queueFull"),
    });
    expect(props.statusLabel).toBe("ANTRIAN PENUH");
    expect(props.statusTone).toBe("warning");
  });

  it("habis sementara (bisa kembali): chip PENUH SEMENTARA, tombol nonaktif", () => {
    const props = toEventCardProps({
      ...baseEvent,
      status: "SOLD_OUT",
      display: disabled("home.event.soldOutMayReturn", "home.event.badge.fullBooked"),
    });
    expect(props.statusLabel).toBe("PENUH SEMENTARA");
    expect(props.statusTone).toBe("warning");
    expect(props.cta).toEqual({ label: "Stok Habis Sementara" });
  });

  it("sold out final: chip SOLD OUT bernada bahaya", () => {
    const props = toEventCardProps({
      ...baseEvent,
      status: "SOLD_OUT",
      display: disabled("home.event.soldOut", "home.event.status.SOLD_OUT"),
    });
    expect(props.statusLabel).toBe("SOLD OUT");
    expect(props.statusTone).toBe("danger");
    expect(props.cta).toEqual({ label: "Habis Terjual" });
  });

  it("kategori event dibawa ke kartu", () => {
    expect(toEventCardProps({ ...baseEvent, category: "FESTIVAL" }).category).toBe("FESTIVAL");
  });
});
