import { describe, expect, it } from "vitest";
import { NIK_LENGTH, sanitizeNikInput } from "../nik.utils";

describe("sanitizeNikInput", () => {
  it("membuang selain digit", () => {
    expect(sanitizeNikInput("3171 0000-0000.0044")).toBe("3171000000000044");
  });

  it("menolak digit setelah ke-16", () => {
    expect(sanitizeNikInput("31710000000000449999")).toBe("3171000000000044");
    expect(sanitizeNikInput("31710000000000449999")).toHaveLength(NIK_LENGTH);
  });

  it("tempelan panjang dengan spasi dipotong setelah dirapikan", () => {
    expect(sanitizeNikInput("3171 0000 0000 0044 55")).toBe("3171000000000044");
  });

  it("isian pendek dan kosong tidak diubah", () => {
    expect(sanitizeNikInput("")).toBe("");
    expect(sanitizeNikInput("3171")).toBe("3171");
  });
});
