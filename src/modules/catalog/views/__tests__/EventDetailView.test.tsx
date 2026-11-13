// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventDetailStatusView } from "../EventDetailStatusView";
import { EventDetailView, type EventDetailViewProps } from "../EventDetailView";

const props: EventDetailViewProps = {
  nav: { items: [], loginHref: "/login", loginLabel: "Masuk" },
  footer: { copyright: "c", tagline: "t" },
  breadcrumb: [{ label: "Beranda", href: "/" }, { label: "Konser A" }],
  name: "Konser A",
  imageUrl: "/images/concert-placeholder.webp",
  category: "LIVE MUSIC",
  statusLabel: "AVAILABLE",
  statusTone: "success",
  facts: [{ kind: "date", label: "Tanggal", value: "25 Des 2026" }],
  description: { title: "Tentang event", body: "Energi panggung." },
  tickets: {
    title: "Kategori tiket",
    subtitle: "Harga per tiket",
    emptyLabel: "Belum ada",
    items: [
      { id: "vip", name: "VIP", price: "Rp 1.500.000", availabilityLabel: "Tersedia", soldOut: false },
      { id: "reg", name: "Regular", price: "Rp 500.000", availabilityLabel: "Habis", soldOut: true },
    ],
  },
  purchase: {
    title: "Beli tiket",
    price: { label: "Mulai dari", value: "Rp 500.000" },
    cta: { label: "Masuk Antrian", href: "/events/evt-1/queue" },
  },
};

describe("EventDetailView", () => {
  it("menampilkan nama sebagai h1, kategori tiket, dan tautan antrian", () => {
    render(<EventDetailView {...props} />);
    expect(screen.getByRole("heading", { level: 1, name: "Konser A" })).toBeTruthy();
    expect(screen.getByText("VIP")).toBeTruthy();
    expect(screen.getByText("Habis")).toBeTruthy();
    const links = screen.getAllByRole("link", { name: /Masuk Antrian/ });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link.getAttribute("href")).toBe("/events/evt-1/queue");
  });

  it("tanpa href tombol nonaktif dan memuat alasannya", () => {
    render(
      <EventDetailView {...props} purchase={{ ...props.purchase, cta: { label: "Buka 10 Nov 09:00" } }} />,
    );
    expect(screen.queryByRole("link", { name: /Buka 10 Nov/ })).toBeNull();
    for (const button of screen.getAllByRole("button", { name: "Buka 10 Nov 09:00" })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("tanpa kategori menampilkan keterangan kosong", () => {
    render(<EventDetailView {...props} tickets={{ ...props.tickets, items: [] }} />);
    expect(screen.getByText("Belum ada")).toBeTruthy();
  });
});

describe("EventDetailStatusView", () => {
  const status = {
    nav: props.nav,
    footer: props.footer,
    illustration: "box" as const,
    title: "Event tidak ditemukan",
    description: "Tidak ada.",
    home: { label: "Kembali ke Beranda", href: "/" },
  };

  it("tanpa retry hanya ada tautan ke Beranda", () => {
    render(<EventDetailStatusView {...status} />);
    expect(screen.getByRole("link", { name: "Kembali ke Beranda" }).getAttribute("href")).toBe("/");
    expect(screen.queryByRole("button", { name: "Coba lagi" })).toBeNull();
  });

  it("dengan retry tombol Coba lagi muncul di samping tautan Beranda", () => {
    render(
      <EventDetailStatusView {...status} retry={{ label: "Coba lagi", busy: false, onClick: () => {} }} />,
    );
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Kembali ke Beranda" })).toBeTruthy();
  });
});
