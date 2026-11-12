// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import { AllEventsView, type AllEventsViewProps } from "../AllEventsView";
import { HomeView, type HomeViewProps } from "../HomeView";

const chrome = toSiteChrome();
const footer = { copyright: "© Rusuh", tagline: "Tagline" };
const grid = { filterLabel: "Filter", allLabel: "Semua", emptyCategoryLabel: "Kosong" };
const retry = (overrides: Partial<{ label: string; busy: boolean; onClick: () => void }> = {}) => ({
  label: "Coba lagi",
  busy: false,
  onClick: vi.fn(),
  ...overrides,
});

const home = (overrides: Partial<HomeViewProps> = {}) => (
  <HomeView
    nav={chrome.nav}
    hero={{ eyebrow: "e", headline: "h", subtext: "s" }}
    eventList={{ title: "Daftar", subtitle: "Sub" }}
    events={[]}
    footer={footer}
    emptyLabel="Belum ada event"
    {...overrides}
  />
);

const allEvents = (overrides: Partial<AllEventsViewProps> = {}) => (
  <AllEventsView
    nav={chrome.nav}
    title="Semua event"
    subtitle="Sub"
    events={[]}
    footer={footer}
    grid={grid}
    emptyLabel="Belum ada event"
    {...overrides}
  />
);

describe.each([
  ["HomeView", home],
  ["AllEventsView", allEvents],
])("%s: tombol muat ulang", (_name, view) => {
  it("tampil di keadaan galat dan memanggil onClick", () => {
    const props = retry();
    render(view({ errorMessage: "Gagal memuat", retry: props }));
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(props.onClick).toHaveBeenCalledTimes(1);
  });

  it("tampil di keadaan belum ada event", () => {
    const props = retry();
    render(view({ retry: props }));
    expect(screen.getByText("Belum ada event")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(props.onClick).toHaveBeenCalledTimes(1);
  });

  it("sibuk: tombol mati dan ditandai aria-busy", () => {
    render(view({ errorMessage: "Gagal memuat", retry: retry({ label: "Memuat ulang…", busy: true }) }));
    const button = screen.getByRole("button", { name: /Memuat ulang…/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("tanpa prop retry tidak ada tombol", () => {
    render(view({ errorMessage: "Gagal memuat" }));
    expect(screen.queryByRole("button", { name: "Coba lagi" })).toBeNull();
  });
});
