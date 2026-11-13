import { describe, expect, it } from "vitest";
import type { EventDetail } from "../../domain/event.model";
import { toEventDetailViewProps } from "../event-detail.mapper";

const base: EventDetail = {
  id: "evt-1",
  name: "Konser A",
  venue: "GBK, Jakarta",
  date: "2026-12-25",
  time: "19:00",
  description: "Energi panggung.",
  category: "LIVE MUSIC",
  imageUrl: "",
  status: "AVAILABLE",
  queueState: "OPEN",
  display: { enabled: true, action: "queue", labelKey: "home.event.cta.queue" },
  ticketCategories: [
    {
      id: "vip",
      name: "VIP",
      description: "Dekat panggung",
      price: 1_500_000,
      available: 5,
      status: "AVAILABLE",
    },
    { id: "reg", name: "Regular", price: 500_000, available: 0, status: "SOLD_OUT" },
  ],
};

/** Intl memakai spasi tak-putus setelah "Rp"; disamakan supaya assertion terbaca. */
const plain = (value: string | undefined) => (value ?? "").replace(/\s/g, " ");

describe("toEventDetailViewProps", () => {
  it("event terbuka: info, harga mulai dari termurah, dan tombol menuju antrian", () => {
    const props = toEventDetailViewProps(base);
    expect(props.breadcrumb).toEqual([{ label: "Beranda", href: "/" }, { label: "Konser A" }]);
    expect(props.imageUrl).toBe("/images/concert-placeholder.webp");
    expect(props.category).toBe("LIVE MUSIC");
    expect(props.facts).toEqual([
      { kind: "date", label: "Tanggal", value: "25 Des 2026" },
      { kind: "time", label: "Waktu", value: "19:00" },
      { kind: "venue", label: "Lokasi", value: "GBK, Jakarta" },
    ]);
    expect(props.description).toEqual({ title: "Tentang event", body: "Energi panggung." });
    expect(props.purchase.cta).toEqual({ label: "Masuk Antrian", href: "/events/evt-1/queue" });
    expect(props.purchase.hint).toBeDefined();
    expect(plain(props.purchase.price?.value)).toBe("Rp 500.000");
  });

  it("kategori tiket: harga terformat dan keadaan habis per kategori", () => {
    const [vip, regular] = toEventDetailViewProps(base).tickets.items;
    expect(vip).toMatchObject({ id: "vip", name: "VIP", description: "Dekat panggung", soldOut: false });
    expect(vip?.availabilityLabel).toBe("Tersedia");
    expect(plain(vip?.price)).toBe("Rp 1.500.000");
    expect(regular).toMatchObject({ id: "reg", soldOut: true, availabilityLabel: "Habis" });
  });

  it("belum dibuka: tombol nonaktif dengan alasan jadwal dan tanpa tautan", () => {
    const props = toEventDetailViewProps({
      ...base,
      queueState: "SCHEDULED",
      saleStartsAt: "2026-11-10T02:00:00Z",
      display: { enabled: false, action: "disabled", labelKey: "home.event.notOpen" },
    });
    expect(props.purchase.cta).toEqual({ label: "Buka 10 Nov 09:00", href: undefined });
    expect(props.purchase.hint).toBeUndefined();
  });

  it("antrian penuh dan habis terjual: tombol nonaktif dengan alasan dari server", () => {
    const full = toEventDetailViewProps({
      ...base,
      queueState: "QUEUE_FULL",
      display: { enabled: false, action: "disabled", labelKey: "home.event.queueFull" },
    });
    expect(full.purchase.cta).toEqual({ label: "Antrian Penuh", href: undefined });

    const soldOut = toEventDetailViewProps({
      ...base,
      status: "SOLD_OUT",
      queueState: "CLOSED",
      display: { enabled: false, action: "disabled", labelKey: "home.event.soldOut" },
    });
    expect(soldOut.purchase.cta).toEqual({ label: "Habis Terjual", href: undefined });
    expect(soldOut.statusTone).toBe("danger");
  });

  it("aksi book dari server tetap mengarah ke antrian, tidak pernah ke /book", () => {
    const props = toEventDetailViewProps({
      ...base,
      display: { enabled: true, action: "book", labelKey: "home.event.cta.book" },
    });
    expect(props.purchase.cta.href).toBe("/events/evt-1/queue");
  });

  it("tanpa jam, deskripsi, dan kategori: bagian itu dilewati dan harga tidak ditampilkan", () => {
    const props = toEventDetailViewProps({
      ...base,
      time: undefined,
      description: undefined,
      ticketCategories: [],
    });
    expect(props.facts.map((fact) => fact.kind)).toEqual(["date", "venue"]);
    expect(props.description).toBeUndefined();
    expect(props.tickets.items).toEqual([]);
    expect(props.purchase.price).toBeUndefined();
  });
});
