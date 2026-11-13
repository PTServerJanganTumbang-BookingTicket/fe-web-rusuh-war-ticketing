// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EventCardProps } from "../EventCard";
import { EventGrid } from "../EventGrid";

const card = (id: string, category: string): EventCardProps => ({
  id,
  name: `Event ${id}`,
  detailHref: `/events/${id}`,
  imageUrl: "/x.webp",
  location: "Jakarta",
  category,
  date: "25 Des 2026",
  venue: "GBK",
  statusLabel: "AVAILABLE",
  statusTone: "success",
  cta: { label: "Masuk Antrian", href: `/events/${id}/queue` },
});

const labels = { filterLabel: "Filter kategori", allLabel: "Semua", emptyCategoryLabel: "Kosong" };

describe("EventGrid", () => {
  it("menyaring kartu menurut kategori dan kembali ke Semua", () => {
    render(<EventGrid events={[card("a", "LIVE MUSIC"), card("b", "FESTIVAL")]} {...labels} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "FESTIVAL" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Event b")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Semua" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("satu kategori saja: filter disembunyikan", () => {
    render(<EventGrid events={[card("a", "LIVE MUSIC")]} {...labels} />);
    expect(screen.queryByRole("group", { name: "Filter kategori" })).toBeNull();
  });

  it("cari menyaring menurut nama, lokasi, atau kategori dan bisa digabung dengan kategori", () => {
    const search = { label: "Cari event", placeholder: "Cari", empty: "Tidak cocok" };
    render(
      <EventGrid events={[card("a", "LIVE MUSIC"), card("b", "FESTIVAL")]} {...labels} search={search} />,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Cari event" }), { target: { value: "event b" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "LIVE MUSIC" }));
    expect(screen.getByText("Tidak cocok")).toBeTruthy();
  });

  it("tanpa prop search tidak ada kotak cari", () => {
    render(<EventGrid events={[card("a", "LIVE MUSIC")]} {...labels} />);
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
