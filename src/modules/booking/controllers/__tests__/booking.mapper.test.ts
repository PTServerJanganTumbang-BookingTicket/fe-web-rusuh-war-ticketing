import { describe, expect, it, vi } from "vitest";
import { EMAIL_MAX_LENGTH } from "@/core/domain/email.constants";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import type { BookingSession } from "../../domain/booking-session.model";
import {
  isBookingFormValid,
  nikError,
  toBookingTimeoutDialog,
  toBookingViewProps,
  type BookingForm,
} from "../booking.mapper";
import { holderChoices } from "../../domain/ticket-holders.rules";

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
    expect(holders[0]?.heading).toEqual({ title: "VIP × 2", priceLabel: expect.stringContaining("/ tiket") });
    expect(holders[0]).not.toHaveProperty("seat");
    expect(build({ selection: {} }).holders).toBeUndefined();
  });

  it("tiket sekategori dikelompokkan: satu judul 'Festival × 2', bukan 'Festival × 1' berulang", () => {
    const holders = build({ selection: { vip: 1, festival: 2 } }).holders?.items ?? [];
    expect(holders.map((holder) => holder.heading?.title)).toEqual(["VIP × 1", "Festival × 2", undefined]);
    expect(holders.map((holder) => holder.nik.label)).toEqual(["NIK tiket 1", "NIK tiket 2", "NIK tiket 3"]);
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

  it("NIK terverifikasi menampilkan pesan terverifikasi", () => {
    const view = build({
      form: {
        ...emptyForm,
        niks: { "vip-0": "3171000000000022" },
        checks: {
          "vip-0": { nik: "3171000000000022", state: "done", result: { status: "valid", name: "JOHN DOE" } },
        },
      },
    });
    expect(view.holders?.items[0]?.nik.success).toBe("NIK terverifikasi");
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

describe("toBookingTimeoutDialog", () => {
  it("modal peringatan dengan catatan hitung mundur dan satu tombol ke Beranda; menutup sama dengan ke Beranda", () => {
    const onGoHome = vi.fn();
    const dialog = toBookingTimeoutDialog({ secondsLeft: 5, onGoHome });
    expect(dialog).toMatchObject({
      tone: "warning",
      illustration: "confirmation",
      title: "Waktu booking habis",
      note: expect.stringContaining("5"),
    });
    expect(dialog.secondary).toBeUndefined();
    expect(dialog.primary).toMatchObject({ label: "Kembali ke beranda", onClick: onGoHome });
    expect(dialog.onDismiss).toBe(onGoHome);
  });
});

describe("email pemesan maksimal 50 karakter", () => {
  const tooLong = `${"a".repeat(EMAIL_MAX_LENGTH)}@example.com`;

  it("input tamu dibatasi maxLength; email akun yang terkunci tidak", () => {
    expect(build().buyer.email.maxLength).toBe(EMAIL_MAX_LENGTH);
    expect(
      build({ account: { email: "rina@example.com", nikMasked: "" } }).buyer.email.maxLength,
    ).toBeUndefined();
  });

  it("nilai yang lebih panjang dari batas langsung diberi galat dan memblokir submit", () => {
    const form: BookingForm = {
      ...emptyForm,
      contactEmail: tooLong,
      niks: { "vip-0": "3171000000000022", "vip-1": "3171000000000033" },
    };
    const view = build({ form });
    expect(view.buyer.email.error).toBe(`Email maksimal ${EMAIL_MAX_LENGTH} karakter.`);
    expect(view.submit.disabled).toBe(true);
    expect(isBookingFormValid(form, ["vip-0", "vip-1"])).toBe(false);
  });
});

describe("akun yang masuk", () => {
  const owner = { email: "rina@example.com", nikMasked: "3171**********11" };
  const budi = { id: "snk_1", label: "Budi", nikMasked: "3171**********33" };
  const labels = (view: ReturnType<typeof build>, index = 0) =>
    view.holders?.items[index]?.holder?.options.map((option) => option.label);

  it("email pemesan terisi dari akun, tidak bisa diubah, tanpa galat, dengan petunjuk akun", () => {
    const view = build({ account: owner, form: { ...emptyForm, submitted: true } });
    expect(view.buyer.email).toMatchObject({ value: "rina@example.com", readOnly: true, error: undefined });
    expect(view.buyer.hint).toBe("E-tiket dikirim ke email akunmu. Email ini tidak bisa diubah di sini.");
  });

  it("tamu: email bisa diketik dan petunjuk biasa", () => {
    const view = build({ form: { ...emptyForm, submitted: true } });
    expect(view.buyer.email.readOnly).toBeUndefined();
    expect(view.buyer.email.error).toBe("Masukkan alamat email yang valid.");
    expect(view.buyer.hint).not.toBe("E-tiket dikirim ke email akunmu. Email ini tidak bisa diubah di sini.");
  });

  it("tanpa alias: pilihan NIK pemilik lalu isi manual, dengan petunjuk akun", () => {
    const view = build({ account: owner, aliases: holderChoices(owner.nikMasked, []) });
    const holder = view.holders?.items[0]?.holder;
    expect(holder?.options.map((option) => option.value)).toEqual(["owner", ""]);
    expect(labels(view)).toEqual(["NIK pemesan · 3171**********11", "NIK lain (isi manual)"]);
    expect(holder?.hint).toBe(
      "Pilih NIK pemesan, alias dari profilmu, atau NIK lain lalu verifikasi ke Dukcapil.",
    );
  });

  it("urutan: pemilik, alias, lalu isi manual", () => {
    const view = build({ account: owner, aliases: holderChoices(owner.nikMasked, [budi]) });
    expect(view.holders?.items[0]?.holder?.options.map((option) => option.value)).toEqual([
      "owner",
      "snk_1",
      "",
    ]);
  });

  it("akun tanpa NIK terverifikasi: pemilik tidak jadi pilihan, tetapi pilihan manual tetap tampil", () => {
    const view = build({ account: { email: owner.email, nikMasked: "" }, aliases: holderChoices("", []) });
    expect(view.holders?.items[0]?.holder?.options.map((option) => option.value)).toEqual([""]);
  });

  it("NIK pemilik yang sudah dipakai tiket lain tidak bisa dipilih lagi (BR-02), kecuali pilihan slot itu sendiri", () => {
    const form: BookingForm = {
      ...emptyForm,
      aliasPicks: { "vip-0": "owner" },
    };
    const view = build({ account: owner, aliases: holderChoices(owner.nikMasked, []), form });
    expect(view.holders?.items[1]?.holder?.options[0]).toMatchObject({
      value: "owner",
      disabled: true,
      label: "NIK pemesan · 3171**********11 (sudah dipakai tiket lain)",
    });
    expect(view.holders?.items[0]?.holder?.options[0]).toMatchObject({ value: "owner", disabled: false });
  });

  it("pemegang dari profil tampil tersamar dan tidak punya NIK lengkap", () => {
    const view = build({
      account: owner,
      aliases: holderChoices(owner.nikMasked, [budi]),
      form: { ...emptyForm, aliasPicks: { "vip-0": "snk_1" } },
    });
    expect(view.holders?.items[0]?.nik).toMatchObject({
      value: "3171**********33",
      readOnly: true,
      success: "NIK ini sudah terverifikasi di profilmu.",
    });
    expect(view.holders?.items[0]?.nik.onBlur).toBeUndefined();
  });

  it("entri Daftar NIK yang sama di dua tiket ditandai duplikat dan memblokir submit (BR-02)", () => {
    const view = build({
      account: owner,
      aliases: holderChoices(owner.nikMasked, [budi]),
      form: {
        ...emptyForm,
        contactEmail: owner.email,
        emailLocked: true,
        aliasPicks: { "vip-0": "snk_1", "vip-1": "snk_1" },
      },
    });
    expect(view.holders?.items.map((item) => item.nik.error)).toEqual([
      "NIK ini sudah dipakai untuk tiket lain di pesanan ini.",
      "NIK ini sudah dipakai untuk tiket lain di pesanan ini.",
    ]);
    expect(view.submit.disabled).toBe(true);
  });

  it("pemegang dari profil tidak butuh NIK 16 digit untuk submit", () => {
    const form: BookingForm = {
      ...emptyForm,
      contactEmail: owner.email,
      emailLocked: true,
      aliasPicks: { "vip-0": "owner", "vip-1": "snk_1" },
    };
    expect(isBookingFormValid(form, ["vip-0", "vip-1"])).toBe(true);
  });
});
