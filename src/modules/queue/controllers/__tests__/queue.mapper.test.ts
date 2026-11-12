import { describe, expect, it } from "vitest";
import type { AppError } from "@/core/domain/app-error";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import {
  toEventCard,
  toQueueGone,
  toQueueGoneDialog,
  toQueueViewProps,
  toWaitingStatus,
} from "../queue.mapper";

const waiting = {
  status: "waiting",
  eventName: "Konser A",
  fullBooked: false,
  stale: false,
  position: 1248,
  joinedPosition: 1248,
  ratePerMin: 318,
  retryAfterMs: 2000,
} as const;

const event = {
  name: "Konser A",
  category: "LIVE MUSIC",
  city: "Jakarta",
  venue: "GBK",
  date: "2026-12-25",
  imageUrl: "/images/event-1.jpg",
};

describe("toWaitingStatus", () => {
  it("memformat posisi, estimasi, badge, dan catatan seperti desain Waiting Room", () => {
    const status = toWaitingStatus(waiting);
    expect(status.badge).toEqual({ label: "Antrean aktif", tone: "success" });
    expect(status.position).toMatchObject({
      label: "Posisi antrian Anda saat ini",
      value: "#1.248",
      suffix: "dari depan antrian",
    });
    expect(status.eta?.value).toBe("± 4 menit");
    expect(status.updatedNote).toBe("Antrean diperbarui secara otomatis");
    expect(status.note).toContain("otomatis masuk");
  });

  it("progress naik saat posisi maju", () => {
    expect(toWaitingStatus(waiting).progress?.percent).toBe(0);
    expect(toWaitingStatus({ ...waiting, position: 416 }).progress?.percent).toBe(66);
  });

  it("FULL_BOOKED menyembunyikan estimasi dan menampilkan pemberitahuan", () => {
    const status = toWaitingStatus({ ...waiting, fullBooked: true });
    expect(status.eta).toBeUndefined();
    expect(status.notice).toContain("Tiket sedang habis");
  });

  it("data basi meredupkan posisi dan mengganti catatan jadi Memperbarui", () => {
    const status = toWaitingStatus({ ...waiting, stale: true });
    expect(status.stale).toBe(true);
    expect(status.updatedNote).toBe("Memperbarui…");
    expect(status.position?.value).toBe("#1.248");
  });

  it("estimasi minimal 1 menit", () => {
    expect(toWaitingStatus({ ...waiting, position: 10 }).eta?.value).toBe("± 1 menit");
  });

  it("laju 0 (belum ada booking diproses): menghitung estimasi, bukan angka", () => {
    expect(toWaitingStatus({ ...waiting, ratePerMin: 0 }).eta).toEqual({
      label: "Estimasi waktu tunggu",
      value: "Menghitung estimasi antrean…",
    });
  });

  it("estimasi panjang ditulis dalam jam dengan koma desimal, lalu lebih dari 3 jam", () => {
    const at = (position: number) => toWaitingStatus({ ...waiting, position, ratePerMin: 1 }).eta?.value;
    expect(at(60)).toBe("± 1 jam");
    expect(at(90)).toBe("± 1,5 jam");
    expect(at(181)).toBe("Lebih dari 3 jam");
  });

  it("posisi 0 saat masih menunggu: giliran sebentar lagi", () => {
    expect(toWaitingStatus({ ...waiting, position: 0 }).eta?.value).toBe("Giliran Anda sebentar lagi");
  });
});

describe("toEventCard", () => {
  it("menyusun tag, nama, tanggal, dan venue", () => {
    expect(toEventCard(event)).toEqual({
      imageUrl: "/images/event-1.jpg",
      tag: "LIVE MUSIC · Jakarta",
      name: "Konser A — Jakarta",
      date: "25 Des 2026",
      venue: "GBK, Jakarta",
    });
  });
});

describe("toQueueViewProps", () => {
  it("breadcrumb dan subjudul memakai nama event", () => {
    const view = toQueueViewProps({
      chrome: toSiteChrome(),
      eventName: "Konser A",
      event,
      status: toWaitingStatus(waiting),
    });
    expect(view.breadcrumb.map((crumb) => crumb.label)).toEqual(["Beranda", "Konser A", "Ruang tunggu"]);
    expect(view.heading).toBe("Sedikit lagi, giliranmu.");
    expect(view.subtitle).toBe("Kamu sudah masuk antrean resmi Konser A.");
    expect(view.tips.items.map((tip) => tip.icon)).toEqual(["nik", "tickets", "connection"]);
  });

  it("tanpa nama event: breadcrumb tanpa event dan subjudul menunggu", () => {
    const view = toQueueViewProps({ chrome: toSiteChrome(), status: { state: "loading" } });
    expect(view.breadcrumb.map((crumb) => crumb.label)).toEqual(["Beranda", "Ruang tunggu"]);
    expect(view.subtitle).toBe("Menyiapkan tempatmu di antrean…");
    expect(view.event).toBeUndefined();
  });
});

describe("toQueueGone", () => {
  const api = (code: "FULL_BOOKED" | "SALE_CLOSED" | "QUEUE_FULL"): AppError => ({
    kind: "api",
    code,
    status: 409,
  });
  const ended = { status: "ended", eventName: "Konser A", reason: "closed" } as const;

  it("join ditolak FULL_BOOKED atau SALE_CLOSED: tiket habis", () => {
    expect(toQueueGone(undefined, api("FULL_BOOKED"))).toEqual({ cause: "sold-out" });
    expect(toQueueGone(undefined, api("SALE_CLOSED"))).toEqual({ cause: "sold-out" });
  });

  it("antrian berstatus ended membawa alasannya", () => {
    expect(toQueueGone(ended, undefined)).toEqual({ cause: "ended", reason: "closed" });
  });

  it("QUEUE_FULL dan galat lain bukan habis: customer masih boleh mencoba lagi", () => {
    expect(toQueueGone(undefined, api("QUEUE_FULL"))).toBeUndefined();
    expect(toQueueGone(undefined, { kind: "network" })).toBeUndefined();
    expect(toQueueGone(undefined, undefined)).toBeUndefined();
  });

  it("galat polling saat data antrian masih ada tidak menggantikan layar menunggu", () => {
    expect(toQueueGone(waiting, api("SALE_CLOSED"))).toBeUndefined();
  });
});

describe("toQueueGoneDialog", () => {
  const onGoHome = () => undefined;

  it("tiket habis: judul dan penjelasan habis, catatan hitung mundur, tombol ke beranda", () => {
    const dialog = toQueueGoneDialog({ gone: { cause: "sold-out" }, seconds: 7, onGoHome });
    expect(dialog).toEqual({
      tone: "warning",
      illustration: "box",
      title: "Tiket sudah habis",
      description: "Semua tiket untuk acara ini sudah terjual, jadi antrian tidak bisa dilanjutkan.",
      note: "Kamu akan diarahkan ke beranda dalam 7 detik.",
      primary: { label: "Kembali ke beranda", onClick: onGoHome },
      onDismiss: onGoHome,
    });
  });

  it.each([
    ["closed", "Penjualan sudah ditutup", "Penjualan tiket untuk acara ini sudah ditutup."],
    [
      "expired",
      "Antrian sudah berakhir",
      "Waktu pemilihan tiketmu sudah habis. Masuk antrian lagi dari awal.",
    ],
    [
      "confirmed",
      "Antrian sudah berakhir",
      "Pembayaranmu sudah selesai. Lihat tiketmu di halaman Tiket saya.",
    ],
  ] as const)("antrian berakhir (%s): judul dan penjelasan sesuai alasan", (reason, title, description) => {
    expect(toQueueGoneDialog({ gone: { cause: "ended", reason }, seconds: 10, onGoHome })).toMatchObject({
      title,
      description,
      note: "Kamu akan diarahkan ke beranda dalam 10 detik.",
    });
  });

  it("hitung mundur belum jalan: catatan memakai total detik", () => {
    expect(toQueueGoneDialog({ gone: { cause: "sold-out" }, seconds: null, onGoHome }).note).toContain(
      "10 detik",
    );
  });
});
