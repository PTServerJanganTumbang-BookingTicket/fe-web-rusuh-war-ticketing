import { describe, expect, it } from "vitest";
import { toAccountLinkProps, toNavLinksProps } from "../siteNav";

const active = (pathname: string | null) => toNavLinksProps(pathname).items.filter((item) => item.active).map((item) => item.href);

describe("toNavLinksProps", () => {
  it("tiga tautan Figma: Jelajahi event, Tiket saya, Bantuan", () => {
    expect(toNavLinksProps("/").items.map((item) => item.label)).toEqual(["Jelajahi event", "Tiket saya", "Bantuan"]);
  });

  it("Home, antrian, booking, dan order menandai Jelajahi event", () => {
    expect(active("/")).toEqual(["/"]);
    expect(active("/events/evt-1/queue")).toEqual(["/"]);
    expect(active("/orders/RB-1/pay")).toEqual(["/"]);
    expect(active("/tiket")).toEqual(["/tiket"]);
    expect(active("/login")).toEqual([]);
  });

  it("URL belum diketahui (fallback prerender): tidak ada yang aktif", () => {
    expect(active(null)).toEqual([]);
  });
});

describe("toAccountLinkProps", () => {
  it("login kembali ke halaman saat ini", () => {
    expect(toAccountLinkProps("/events/evt-1/queue").href).toBe("/login?returnTo=%2Fevents%2Fevt-1%2Fqueue");
  });

  it("dari Home, halaman auth, atau fallback: /login polos", () => {
    expect(toAccountLinkProps("/").href).toBe("/login");
    expect(toAccountLinkProps("/register").href).toBe("/login");
    expect(toAccountLinkProps(null).href).toBe("/login");
  });
});
