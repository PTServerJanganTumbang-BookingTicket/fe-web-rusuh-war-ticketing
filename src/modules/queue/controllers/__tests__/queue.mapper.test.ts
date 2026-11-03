import { describe, expect, it } from "vitest";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import { toEventCard, toQueueViewProps, toWaitingStatus } from "../queue.mapper";

const waiting = {
  status: "waiting",
  eventName: "Konser A",
  position: 1248,
  joinedPosition: 1248,
  etaSeconds: 240,
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

  it("estimasi minimal 1 menit", () => {
    expect(toWaitingStatus({ ...waiting, position: 10, etaSeconds: 2 }).eta?.value).toBe("± 1 menit");
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
