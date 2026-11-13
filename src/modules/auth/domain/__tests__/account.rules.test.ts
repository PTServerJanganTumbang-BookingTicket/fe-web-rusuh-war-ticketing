import { describe, expect, it } from "vitest";
import { EMAIL_MAX_LENGTH } from "@/core/domain/email.constants";
import {
  emailInputError,
  isEmail,
  isNikFormat,
  safeRedirectPath,
  sanitizeSavedNikLabelInput,
  savedNikLabelOf,
  validateSavedNikInput,
} from "../account.rules";
import { SAVED_NIK_LABEL_MAX_LENGTH } from "../auth.constants";

describe("isNikFormat", () => {
  it("hanya 16 digit angka", () => {
    expect(isNikFormat("3171000000000022")).toBe(true);
    expect(isNikFormat("317100000000002")).toBe(false);
    expect(isNikFormat("31710000000000222")).toBe(false);
    expect(isNikFormat("3171-00000000002")).toBe(false);
  });
});

describe("isEmail", () => {
  it("menerima alamat dengan satu @ dan domain bertitik, spasi tepi diabaikan", () => {
    for (const value of ["a@b.co", " rina@example.com ", "a.b+c@mail.example.id", "a@b.c.d"])
      expect(isEmail(value)).toBe(true);
  });

  it("menolak alamat tanpa @, dengan @ ganda, tanpa lokal, atau domain tanpa titik yang diapit karakter", () => {
    for (const value of [
      "",
      "abc",
      "a@b",
      "@b.co",
      "a@@b.co",
      "a@b@c.co",
      "a@.co",
      "a@b.",
      "a b@c.co",
      "a@b .co",
    ])
      expect(isEmail(value)).toBe(false);
  });

  it("input panjang tanpa titik selesai cepat (tanpa backtracking)", () => {
    const started = performance.now();
    expect(isEmail(`${"a".repeat(50_000)}@${"b".repeat(50_000)}`)).toBe(false);
    expect(performance.now() - started).toBeLessThan(200);
  });
});

describe("emailInputError", () => {
  const emailOfLength = (length: number) => `${"a".repeat(length - "@example.com".length)}@example.com`;

  it("kosong, bentuk salah, dan valid", () => {
    expect(emailInputError("  ")).toBe("required");
    expect(emailInputError("you@")).toBe("invalid");
    expect(emailInputError(" you@example.com ")).toBeNull();
  });

  it("tepat di batas panjang masih diterima, satu karakter lebih ditolak", () => {
    expect(emailOfLength(EMAIL_MAX_LENGTH)).toHaveLength(50);
    expect(emailInputError(emailOfLength(EMAIL_MAX_LENGTH))).toBeNull();
    expect(emailInputError(emailOfLength(EMAIL_MAX_LENGTH + 1))).toBe("too_long");
  });

  it("panjang dihitung tanpa spasi tepi, dan terlalu panjang menang atas bentuk salah", () => {
    expect(emailInputError(` ${emailOfLength(EMAIL_MAX_LENGTH)} `)).toBeNull();
    expect(emailInputError("a".repeat(EMAIL_MAX_LENGTH + 1))).toBe("too_long");
  });
});

describe("sanitizeSavedNikLabelInput", () => {
  it("nama berspasi bisa diketik, termasuk spasi di akhir saat kata berikutnya belum diketik", () => {
    expect(sanitizeSavedNikLabelInput("Budi Santoso")).toBe("Budi Santoso");
    expect(sanitizeSavedNikLabelInput("Budi ")).toBe("Budi ");
    expect(sanitizeSavedNikLabelInput("Budi2")).toBe("Budi2");
  });

  it("membuang karakter selain huruf A-Z, a-z, dan angka", () => {
    expect(sanitizeSavedNikLabelInput("Budi (adik) #1!")).toBe("Budi adik 1");
    expect(sanitizeSavedNikLabelInput("Bu@di_San-toso.")).toBe("BudiSantoso");
    expect(sanitizeSavedNikLabelInput("Renée 😀 Ümit")).toBe("Rene mit");
  });

  it("spasi di awal dibuang, spasi beruntun dan whitespace lain jadi satu spasi", () => {
    expect(sanitizeSavedNikLabelInput("   Budi")).toBe("Budi");
    expect(sanitizeSavedNikLabelInput(" ")).toBe("");
    expect(sanitizeSavedNikLabelInput("Budi    Santoso")).toBe("Budi Santoso");
    expect(sanitizeSavedNikLabelInput("Budi\t\nSantoso")).toBe("Budi Santoso");
    // Spasi yang tersisa setelah simbol di antaranya dibuang tetap dirapatkan.
    expect(sanitizeSavedNikLabelInput("Budi - Santoso")).toBe("Budi Santoso");
  });

  it("dipotong di batas panjang setelah dibersihkan", () => {
    const long = "a".repeat(SAVED_NIK_LABEL_MAX_LENGTH + 10);
    expect(sanitizeSavedNikLabelInput(long)).toHaveLength(SAVED_NIK_LABEL_MAX_LENGTH);
    expect(sanitizeSavedNikLabelInput(`${"!".repeat(60)}Budi`)).toBe("Budi");
  });

  it("hasilnya selalu lolos validasi submit, termasuk nama otomatis dari NIK", () => {
    for (const raw of [
      "Budi (adik)",
      "  a  b  ",
      "x".repeat(80),
      "名前 Budi",
      savedNikLabelOf("", "3171000000000033"),
    ]) {
      const label = sanitizeSavedNikLabelInput(raw);
      expect(validateSavedNikInput({ label, nik: "3171000000000033" })).toBeNull();
    }
    expect(sanitizeSavedNikLabelInput(savedNikLabelOf("", "3171000000000033"))).toBe("NIK 0033");
  });
});

describe("validateSavedNikInput", () => {
  it("NIK 16 digit wajib, nama alias boleh kosong", () => {
    expect(validateSavedNikInput({ label: "Budi", nik: "3171000000000033" })).toBeNull();
    expect(validateSavedNikInput({ label: "  ", nik: "3171000000000033" })).toBeNull();
    expect(validateSavedNikInput({ label: "  ", nik: "" })).toEqual({ nik: "format" });
  });

  it("alias kosong diberi nama dari 4 digit terakhir NIK", () => {
    expect(savedNikLabelOf(" ", "3171000000000033")).toBe("NIK 0033");
    expect(savedNikLabelOf(" Budi ", "3171000000000033")).toBe("Budi");
  });

  it("nama alias dibatasi panjangnya", () => {
    const label = "a".repeat(SAVED_NIK_LABEL_MAX_LENGTH + 1);
    expect(validateSavedNikInput({ label, nik: "3171000000000033" })).toEqual({
      label: "too_long",
    });
    expect(validateSavedNikInput({ label: label.slice(1), nik: "3171000000000033" })).toBeNull();
  });

  it("nama alias hanya huruf, angka, dan spasi", () => {
    for (const label of ["Budi Santoso", "Budi2"])
      expect(validateSavedNikInput({ label, nik: "3171000000000033" })).toBeNull();
    for (const label of ["Budi-1", "Budi_", "Bu@di", "Budi•"])
      expect(validateSavedNikInput({ label, nik: "3171000000000033" })).toEqual({ label: "invalid_chars" });
  });

  it("NIK yang diisi harus 16 digit angka", () => {
    expect(validateSavedNikInput({ label: "Budi", nik: "123" })).toEqual({
      nik: "format",
    });
  });
});

describe("safeRedirectPath", () => {
  it("meloloskan halaman bayar dan antrean booking", () => {
    expect(safeRedirectPath("/orders/RB-00912/pay")).toBe("/orders/RB-00912/pay");
    expect(safeRedirectPath("/events/evt_konser_a/queue")).toBe("/events/evt_konser_a/queue");
  });

  it.each([
    null,
    "",
    "/",
    "//evil.com",
    "https://evil.com",
    "/account",
    "/orders/RB-1/pay?x=1",
    "/orders/RB-1/pay#frag",
    "/orders//pay",
    "/orders/a/b/pay",
    "/orders/evt%20a/pay",
    "/events/evt_a/queue/",
  ])("%j → beranda", (next) => {
    expect(safeRedirectPath(next)).toBe("/");
  });
});
