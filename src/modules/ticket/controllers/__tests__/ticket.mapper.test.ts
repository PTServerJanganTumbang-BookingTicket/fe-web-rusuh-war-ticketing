import { describe, expect, it } from "vitest";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import type { ETicket, TicketSummary } from "../../domain/ticket.model";
import { toETicketViewProps, toTicketCardProps } from "../ticket.mapper";

const eticket: ETicket = {
  id: "TKT-001",
  event: { id: "evt_konser_a", name: "Konser A", date: "2026-12-25", time: "19:00", venue: "GBK, Jakarta" },
  category: "VIP",
  priceIdr: 0,
  nik: "3171********xx22",
  holderName: "",
  holderEmail: "",
  status: "ISSUED",
  qrCode: "data:image/png;base64,AAAA",
  qrValue: "TKT-001|evt_konser_a|3171000000000022",
  instructions: "Tunjukkan QR code.",
  issuedAt: "",
  bookingId: "",
};

describe("toETicketViewProps", () => {
  it("field yang belum dikirim kontrak tidak ditampilkan", () => {
    const view = toETicketViewProps(eticket, toSiteChrome());
    expect(view.details).toEqual([
      { label: "Kategori", value: "VIP" },
      { label: "Nomor tiket", value: "TKT-001" },
    ]);
    expect(view.holder).toEqual([{ label: "NIK", value: "3171********xx22" }]);
    expect(view.eventDate).toBe("Jumat, 25 Desember 2026, 19:00 WIB");
    expect(view.statusLabel).toBe("Aktif");
    expect(view.instructions).toEqual({ title: "Instruksi masuk", text: "Tunjukkan QR code." });
    expect(view.header.breadcrumb).toEqual([{ label: "Beranda", href: "/" }, { label: "TKT-001" }]);
  });

  it("customer yang masuk melihat jejak Tiket Saya; tamu dari tautan email tidak (ADR-0023)", () => {
    const view = toETicketViewProps(
      eticket,
      toSiteChrome({ account: { email: "budi@example.com", nikMasked: "3171****22" } }),
    );
    expect(view.header.breadcrumb).toEqual([
      { label: "Beranda", href: "/" },
      { label: "Tiket Saya", href: "/tickets" },
      { label: "TKT-001" },
    ]);
  });

  it("QR digambar dari qr_value, bukan dari gambar BE yang bisa kosong; kode tiket ikut tampil", () => {
    const view = toETicketViewProps(eticket, toSiteChrome());
    expect(view.qr.src.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(view.qr.src)).toContain("<svg");
    expect(view.qr.code).toBe("Kode tiket TKT-001");
  });

  it("qr_value kosong: memakai gambar qr_code dari BE", () => {
    const view = toETicketViewProps({ ...eticket, qrValue: "" }, toSiteChrome());
    expect(view.qr.src).toBe("data:image/png;base64,AAAA");
  });

  it("harga, nama, dan email tampil bila ada, tanpa nomor bangku", () => {
    const view = toETicketViewProps(
      { ...eticket, priceIdr: 1_500_000, holderName: "Rina", holderEmail: "r@x.co" },
      toSiteChrome(),
    );
    expect(view.details.map((row) => row.label)).toEqual(["Kategori", "Harga", "Nomor tiket"]);
    expect(view.holder.map((row) => row.value)).toEqual(["Rina", "3171********xx22", "r@x.co"]);
  });

  it("tanpa instruksi dan jam: bagian itu tidak ada", () => {
    const view = toETicketViewProps(
      { ...eticket, instructions: "", event: { ...eticket.event, time: undefined } },
      toSiteChrome(),
    );
    expect(view.instructions).toBeUndefined();
    expect(view.eventDate).toBe("Jumat, 25 Desember 2026");
  });
});

describe("toTicketCardProps", () => {
  const summary: TicketSummary = {
    id: "TKT-001",
    event: { id: "evt_konser_a", name: "Konser A", date: "2026-12-25", venue: "GBK" },
    category: "VIP",
    priceIdr: 1_500_000,
    nikMasked: "",
    holderName: "",
    status: "ISSUED",
    issuedAt: "",
  };

  it("baris tanpa nilai (nama, NIK) tidak muncul; kategori, harga, dan nomor tiket muncul", () => {
    const labels = toTicketCardProps(summary).details.map((row) => row.label);
    expect(labels).toEqual(["Kategori", "Harga", "Nomor tiket"]);
  });

  it("nama dan NIK tampil bila kontrak kelak mengirimnya", () => {
    const { details } = toTicketCardProps({ ...summary, holderName: "Rina", nikMasked: "3171********0044" });
    expect(details.map((row) => row.label)).toContain("Nama");
    expect(details.find((row) => row.label === "NIK")?.mono).toBe(true);
  });

  it("harga 0 tidak ditampilkan", () => {
    const { details } = toTicketCardProps({ ...summary, priceIdr: 0 });
    expect(details.map((row) => row.label)).not.toContain("Harga");
  });
});
