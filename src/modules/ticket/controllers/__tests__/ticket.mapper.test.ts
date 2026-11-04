import { describe, expect, it } from "vitest";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import type { ETicket } from "../../domain/ticket.model";
import { toETicketViewProps } from "../ticket.mapper";

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
    expect(view.back.href).toBe("/tickets");
  });

  it("harga, bangku, nama, dan email tampil bila ada", () => {
    const view = toETicketViewProps(
      { ...eticket, priceIdr: 1_500_000, seatNumber: "A-12", holderName: "Rina", holderEmail: "r@x.co" },
      toSiteChrome(),
    );
    expect(view.details.map((row) => row.label)).toEqual([
      "Kategori",
      "Nomor bangku",
      "Harga",
      "Nomor tiket",
    ]);
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
