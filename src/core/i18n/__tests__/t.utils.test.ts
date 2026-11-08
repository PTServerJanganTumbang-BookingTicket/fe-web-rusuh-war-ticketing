import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../en.messages";
import { t } from "../t.utils";
import { getLocale, intlLocale, isLocale, setLocale, subscribeLocale } from "../locale.utils";

afterEach(() => setLocale("id"));

describe("t", () => {
  it("mengganti placeholder", () => {
    expect(t("queue.position.value", { position: "1.248" })).toBe("#1.248");
    expect(t("queue.eta.value", { minutes: 4 })).toBe("± 4 menit");
  });

  it("membiarkan placeholder tanpa nilai", () => {
    expect(t("queue.position.value")).toBe("#{position}");
  });

  it("memakai bahasa aktif", () => {
    setLocale("en");
    expect(t("account.saved.confirm.title")).toBe("Delete alias?");
    expect(t("booking.holder.nik.label", { number: 2 })).toBe("NIK for ticket 2");
  });

  it("key yang belum diterjemahkan jatuh ke Bahasa Indonesia", () => {
    setLocale("en");
    const original = en["queue.title"];
    delete en["queue.title"];
    try {
      expect(t("queue.title")).toBe("Ruang Tunggu");
    } finally {
      en["queue.title"] = original;
    }
  });

  it("menerjemahkan layar non-booking ke Inggris", () => {
    setLocale("en");
    expect(t("queue.title")).toBe("Waiting Room");
    expect(t("login.submit")).toBe("Send login link");
  });
});

describe("locale.utils", () => {
  it("bawaan Bahasa Indonesia", () => {
    expect(getLocale()).toBe("id");
    expect(intlLocale()).toBe("id-ID");
  });

  it("memberi tahu pelanggan hanya saat bahasa benar-benar berubah", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLocale(listener);
    setLocale("id");
    expect(listener).not.toHaveBeenCalled();
    setLocale("en");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(intlLocale()).toBe("en-US");
    unsubscribe();
    setLocale("id");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("hanya menerima kode bahasa yang didukung", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
