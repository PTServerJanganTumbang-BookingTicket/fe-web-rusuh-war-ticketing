import { describe, expect, it, vi } from "vitest";
import { initialsOf, toSiteChrome } from "../site-chrome.utils";

describe("toSiteChrome", () => {
  it("tamu: tombol masuk, tanpa akun", () => {
    const { nav } = toSiteChrome();
    expect(nav.account).toBeUndefined();
    expect(nav.loginHref).toBe("/login");
    expect(nav.items.some((item) => item.active)).toBe(false);
  });

  it("Tiket saya hanya ada di menu saat masuk; tamu tidak melihatnya", () => {
    const hrefs = (account?: { email: string; nikMasked: string }) =>
      toSiteChrome({ account }).nav.items.map((item) => item.href);
    expect(hrefs()).toEqual(["/", "/help"]);
    expect(hrefs({ email: "budi@example.com", nikMasked: "3171****22" })).toEqual(["/", "/tickets", "/help"]);
  });

  it("avatar memakai nama sebelum @, bukan domain email", () => {
    const { nav } = toSiteChrome({ account: { email: "you@example.com", nikMasked: "3171****22" } });
    expect(nav.account?.initials).toBe("Y");
  });

  it("customer masuk: avatar dan nama pendek menuju profil", () => {
    const { nav } = toSiteChrome({ account: { email: "budi.santoso@example.com", nikMasked: "3171****22" } });
    expect(nav.account).toEqual({
      label: "budi.santoso",
      initials: "BS",
      href: "/account",
      ariaLabel: "Profil saya (budi.santoso@example.com)",
    });
  });

  it("tanpa pengganti bahasa bila locale tidak diberikan (mapper murni, server)", () => {
    expect(toSiteChrome().nav.language).toBeUndefined();
  });

  it("pengganti bahasa: ID dan EN, nilai asing diabaikan", () => {
    const onLocaleChange = vi.fn();
    const { nav } = toSiteChrome({ locale: "id", onLocaleChange });
    expect(nav.language?.value).toBe("id");
    expect(nav.language?.options).toEqual([
      { value: "id", label: "Bahasa Indonesia", short: "ID" },
      { value: "en", label: "English", short: "EN" },
    ]);
    nav.language?.onChange("fr");
    expect(onLocaleChange).not.toHaveBeenCalled();
    nav.language?.onChange("en");
    expect(onLocaleChange).toHaveBeenCalledWith("en");
  });

  it("menandai menu halaman aktif", () => {
    const { nav } = toSiteChrome({
      active: "/tickets",
      account: { email: "budi@example.com", nikMasked: "3171****22" },
    });
    expect(nav.items.filter((item) => item.active).map((item) => item.href)).toEqual(["/tickets"]);
  });
});

describe("initialsOf", () => {
  it("dua huruf awal dari nama atau email", () => {
    expect(initialsOf("Budi Santoso")).toBe("BS");
    expect(initialsOf("you@example.com")).toBe("YE");
    expect(initialsOf("Sari")).toBe("S");
  });
});
