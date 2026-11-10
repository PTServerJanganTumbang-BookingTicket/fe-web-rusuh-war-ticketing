import { describe, expect, it } from "vitest";
import { isEmail, isNikFormat, savedNikLabelOf, validateSavedNikInput } from "../account.rules";
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

describe("validateSavedNikInput", () => {
  it("NIK 16 digit wajib, nama alias boleh kosong", () => {
    expect(validateSavedNikInput({ label: "Budi", nik: "3171000000000033" })).toBeNull();
    expect(validateSavedNikInput({ label: "  ", nik: "3171000000000033" })).toBeNull();
    expect(validateSavedNikInput({ label: "  ", nik: "" })).toEqual({ nik: "format" });
  });

  it("alias kosong diberi nama dari 4 digit terakhir NIK", () => {
    expect(savedNikLabelOf(" ", "3171000000000033")).toBe("NIK ••0033");
    expect(savedNikLabelOf(" Budi ", "3171000000000033")).toBe("Budi");
  });

  it("nama alias dibatasi panjangnya", () => {
    const label = "a".repeat(SAVED_NIK_LABEL_MAX_LENGTH + 1);
    expect(validateSavedNikInput({ label, nik: "3171000000000033" })).toEqual({
      label: "too_long",
    });
    expect(validateSavedNikInput({ label: label.slice(1), nik: "3171000000000033" })).toBeNull();
  });

  it("NIK yang diisi harus 16 digit angka", () => {
    expect(validateSavedNikInput({ label: "Budi", nik: "123" })).toEqual({
      nik: "format",
    });
  });
});
