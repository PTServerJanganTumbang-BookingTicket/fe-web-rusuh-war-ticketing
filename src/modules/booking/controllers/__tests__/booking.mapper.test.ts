import { describe, expect, it, vi } from "vitest";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import type { BookingSession } from "../../domain/booking-session.model";
import { isBookingFormValid, nikError, toBookingViewProps, type BookingForm } from "../booking.mapper";

const session: BookingSession = {
  eventName: "Konser A",
  expiresAt: "2026-10-19T10:05:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
  maskedNik: null,
  quota: { max: 3, used: 0, remaining: 3 },
  categories: [
    { id: "vip", name: "VIP", description: "Lebih dekat.", priceIdr: 1_500_000, stock: 12 },
    { id: "festival", name: "Festival", description: "Area festival.", priceIdr: 850_000, stock: 240 },
    { id: "tribune", name: "Tribune", description: "", priceIdr: 500_000, stock: 0 },
  ],
};

const event = {
  name: "Konser A",
  category: "LIVE MUSIC",
  city: "Jakarta",
  venue: "GBK",
  date: "2026-12-25",
  imageUrl: "/images/concert-placeholder.webp",
};

const emptyForm: BookingForm = {
  contactEmail: "",
  niks: {},
  checks: {},
  touched: new Set(),
  submitted: false,
};

const build = (overrides: Partial<Parameters<typeof toBookingViewProps>[0]> = {}) =>
  toBookingViewProps({
    chrome: toSiteChrome(),
    eventId: "evt_konser_a",
    session,
    event,
    selection: { vip: 2 },
    remainingMs: 287_000,
    form: emptyForm,
    submitting: false,
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onContactEmail: vi.fn(),
    onNik: vi.fn(),
    onNikBlur: vi.fn(),
    onFieldBlur: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  });

describe("toBookingViewProps", () => {
  it("judul, langkah, dan breadcrumb mengikuti desain Detail Tiket", () => {
    const view = build();
    expect(view.header.heading).toBe("Pilih tempatmu di konser.");
    expect(view.header.subtitle).toBe("Amankan tiket Konser A — Jakarta sebelum kehabisan.");
    expect(view.header.breadcrumb.map((crumb) => crumb.label)).toEqual([
      "Beranda",
      "Konser A",
      "Detail tiket",
    ]);
    expect(view.header.steps?.map((step) => step.state)).toEqual(["current", "upcoming", "upcoming"]);
    expect(view.countdown).toMatchObject({ value: "04:47", urgent: false });
  });

  it("ringkasan per kategori, total, dan catatan jumlah tiket", () => {
    const view = build({ selection: { vip: 2, festival: 1 } });
    expect(view.summary.lines.map((line) => line.label)).toEqual(["VIP × 2", "Festival × 1"]);
    expect(view.summary.total).toContain("3.850.000");
    expect(view.summary.footnote).toBe("3 tiket · Maksimal 3 tiket per pesanan");
  });

  it("satu slot identitas per tiket, dengan nomor bangku otomatis", () => {
    const holders = build().holders?.items ?? [];
    expect(holders.map((holder) => holder.nik.label)).toEqual(["NIK tiket 1", "NIK tiket 2"]);
    expect(holders[0]).toMatchObject({ title: "VIP × 1" });
    expect(holders[0]).not.toHaveProperty("seat");
    expect(build({ selection: {} }).holders).toBeUndefined();
  });

  it("batas 3 tiket per pesanan menutup semua tombol tambah; stok habis tidak bisa ditambah", () => {
    const full = build({ selection: { vip: 2, festival: 1 } });
    expect(full.categories.items.every((category) => !category.canAdd)).toBe(true);
    const tribune = build({ selection: {} }).categories.items.find((category) => category.id === "tribune");
    expect(tribune).toMatchObject({ soldOut: true, canAdd: false, stockLabel: "Habis" });
  });

  it("galat pemesan baru tampil setelah dikirim", () => {
    const submitted = build({ form: { ...emptyForm, submitted: true } });
    expect(submitted.buyer.email.error).toBe("Masukkan alamat email yang valid.");
  });

  it("NIK terverifikasi menampilkan nama dari Dukcapil", () => {
    const view = build({
      form: {
        ...emptyForm,
        niks: { "vip-0": "3171000000000022" },
        checks: {
          "vip-0": { nik: "3171000000000022", state: "done", result: { status: "valid", name: "JOHN DOE" } },
        },
      },
    });
    expect(view.holders?.items[0]?.nik.success).toBe("Terverifikasi atas nama JOHN DOE");
  });

  it("tombol lanjut mati tanpa tiket atau saat waktu habis", () => {
    expect(build({ selection: {} }).submit.disabled).toBe(true);
    expect(build({ remainingMs: 0 }).submit.disabled).toBe(true);
    // With valid form data, button should be enabled
    const validForm: BookingForm = {
      ...emptyForm,
      contactEmail: "rina@example.com",
      niks: { "vip-0": "3171000000000022", "vip-1": "3171000000000033" },
    };
    expect(build({ form: validForm }).submit.disabled).toBe(false);
  });

  it("tombol lanjut mati saat form tidak valid", () => {
    // Empty form with tickets selected should disable button
    expect(build().submit.disabled).toBe(true);
    // Invalid email
    expect(
      build({
        form: {
          ...emptyForm,
          contactEmail: "invalid",
          niks: { "vip-0": "3171000000000022", "vip-1": "3171000000000033" },
        },
      }).submit.disabled,
    ).toBe(true);
    // Missing NIK
    expect(
      build({
        form: {
          ...emptyForm,
          contactEmail: "rina@example.com",
          niks: { "vip-0": "3171000000000022" },
        },
      }).submit.disabled,
    ).toBe(true);
    // Duplicate NIK
    expect(
      build({
        form: {
          ...emptyForm,
          contactEmail: "rina@example.com",
          niks: { "vip-0": "3171000000000022", "vip-1": "3171000000000022" },
        },
      }).submit.disabled,
    ).toBe(true);
  });
});

describe("nikError", () => {
  it("urutan galat: format, duplikat, lalu hasil Dukcapil untuk NIK yang sama", () => {
    expect(nikError("123", { show: true, duplicate: false })).toBe("NIK harus 16 digit angka.");
    expect(nikError("3171000000000022", { show: true, duplicate: true })).toBe(
      "NIK ini sudah dipakai untuk tiket lain di pesanan ini.",
    );
    const used = { nik: "3171000000000022", state: "done", result: { status: "used" } } as const;
    expect(nikError("3171000000000022", { show: true, duplicate: false, check: used })).toBe(
      "NIK ini sudah dipakai untuk event ini.",
    );
    // Hasil untuk NIK lama diabaikan setelah diketik ulang.
    expect(nikError("3171000000000033", { show: true, duplicate: false, check: used })).toBeUndefined();
    expect(
      nikError("3171000000000022", {
        show: true,
        duplicate: false,
        check: { nik: "3171000000000022", state: "failed" },
      }),
    ).toBe("NIK belum bisa dicek. Coba lagi sebentar.");
  });
});

describe("isBookingFormValid", () => {
  const valid: BookingForm = {
    ...emptyForm,
    contactEmail: "rina@example.com",
    niks: { "vip-0": "3171000000000022", "vip-1": "3171000000000033" },
  };

  it("butuh pemesan lengkap dan NIK unik berformat benar untuk setiap tiket", () => {
    expect(isBookingFormValid(valid, ["vip-0", "vip-1"])).toBe(true);
    expect(isBookingFormValid(valid, [])).toBe(false);
    expect(
      isBookingFormValid({ ...valid, niks: { "vip-0": "1", "vip-1": "3171000000000033" } }, [
        "vip-0",
        "vip-1",
      ]),
    ).toBe(false);
    expect(
      isBookingFormValid({ ...valid, niks: { "vip-0": "3171000000000022", "vip-1": "3171000000000022" } }, [
        "vip-0",
        "vip-1",
      ]),
    ).toBe(false);
  });

  it("NIK yang ditolak Dukcapil memblokir submit", () => {
    const rejected = {
      ...valid,
      checks: {
        "vip-0": { nik: "3171000000000022", state: "done", result: { status: "inactive" } },
      } as const,
    };
    expect(isBookingFormValid(rejected, ["vip-0", "vip-1"])).toBe(false);
  });
});
