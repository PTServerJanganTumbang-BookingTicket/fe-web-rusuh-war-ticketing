import { describe, expect, it } from "vitest";
import { isNikFormat, validateSavedNikInput } from "../account.rules";
import { SAVED_NIK_LABEL_MAX_LENGTH } from "../auth.constants";

describe("isNikFormat", () => {
  it("hanya 16 digit angka", () => {
    expect(isNikFormat("3171000000000022")).toBe(true);
    expect(isNikFormat("317100000000002")).toBe(false);
    expect(isNikFormat("31710000000000222")).toBe(false);
    expect(isNikFormat("3171-00000000002")).toBe(false);
  });
});

describe("validateSavedNikInput", () => {
  it("membuat alias: nama dan NIK 16 digit wajib", () => {
    expect(validateSavedNikInput({ label: "Budi", nik: "3171000000000033" }, { mode: "create" })).toBeNull();
    expect(validateSavedNikInput({ label: "  ", nik: "" }, { mode: "create" })).toEqual({
      label: "required",
      nik: "format",
    });
  });

  it("nama alias dibatasi panjangnya", () => {
    const label = "a".repeat(SAVED_NIK_LABEL_MAX_LENGTH + 1);
    expect(validateSavedNikInput({ label, nik: "3171000000000033" }, { mode: "create" })).toEqual({
      label: "too_long",
    });
    expect(
      validateSavedNikInput({ label: label.slice(1), nik: "3171000000000033" }, { mode: "create" }),
    ).toBeNull();
  });

  it("mengubah alias: NIK kosong berarti tetap, NIK yang diisi harus 16 digit", () => {
    expect(validateSavedNikInput({ label: "Budi", nik: "" }, { mode: "edit" })).toBeNull();
    expect(validateSavedNikInput({ label: "Budi", nik: "123" }, { mode: "edit" })).toEqual({ nik: "format" });
  });
});
