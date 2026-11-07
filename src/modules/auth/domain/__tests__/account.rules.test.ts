import { describe, expect, it } from "vitest";
import { isNikFormat, validateSavedNikInput } from "../account.rules";
import { SAVED_NIK_LABEL_MAX_LENGTH, SAVED_NIK_NAME_MAX_LENGTH } from "../auth.constants";

const NAME = "Budi Santoso";

describe("isNikFormat", () => {
  it("hanya 16 digit angka", () => {
    expect(isNikFormat("3171000000000022")).toBe(true);
    expect(isNikFormat("317100000000002")).toBe(false);
    expect(isNikFormat("31710000000000222")).toBe(false);
    expect(isNikFormat("3171-00000000002")).toBe(false);
  });
});

describe("validateSavedNikInput", () => {
  it("membuat alias: nama alias, nama lengkap, dan NIK 16 digit wajib", () => {
    expect(
      validateSavedNikInput({ label: "Budi", name: NAME, nik: "3171000000000033" }, { mode: "create" }),
    ).toBeNull();
    expect(validateSavedNikInput({ label: "  ", name: " ", nik: "" }, { mode: "create" })).toEqual({
      label: "required",
      name: "required",
      nik: "format",
    });
  });

  it("nama lengkap wajib diisi meski nama alias dan NIK sudah benar", () => {
    expect(
      validateSavedNikInput({ label: "Budi", name: "", nik: "3171000000000033" }, { mode: "create" }),
    ).toEqual({ name: "required" });
    expect(validateSavedNikInput({ label: "Budi", name: "", nik: "" }, { mode: "edit" })).toEqual({
      name: "required",
    });
  });

  it("nama alias dan nama lengkap dibatasi panjangnya", () => {
    const label = "a".repeat(SAVED_NIK_LABEL_MAX_LENGTH + 1);
    const name = "b".repeat(SAVED_NIK_NAME_MAX_LENGTH + 1);
    expect(validateSavedNikInput({ label, name, nik: "3171000000000033" }, { mode: "create" })).toEqual({
      label: "too_long",
      name: "too_long",
    });
    expect(
      validateSavedNikInput(
        { label: label.slice(1), name: name.slice(1), nik: "3171000000000033" },
        { mode: "create" },
      ),
    ).toBeNull();
  });

  it("mengubah alias: NIK kosong berarti tetap, NIK yang diisi harus 16 digit", () => {
    expect(validateSavedNikInput({ label: "Budi", name: NAME, nik: "" }, { mode: "edit" })).toBeNull();
    expect(validateSavedNikInput({ label: "Budi", name: NAME, nik: "123" }, { mode: "edit" })).toEqual({
      nik: "format",
    });
  });
});
