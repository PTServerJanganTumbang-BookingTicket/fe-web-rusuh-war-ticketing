import { describe, expect, it } from "vitest";
import { emailProblem, isValidNik, nikProblem, registrationProblems, resolveReturnTo, sanitizeNikInput } from "../validation";

describe("nikProblem dan sanitizeNikInput", () => {
  it("kosong required, bukan 16 digit invalid", () => {
    expect(nikProblem("")).toBe("required");
    expect(nikProblem("000000")).toBe("invalid");
    expect(nikProblem("0000000000000001")).toBeUndefined();
  });

  it("input hanya digit dan dipotong 16, termasuk saat paste", () => {
    expect(sanitizeNikInput("3171-0000 0000 0001")).toBe("3171000000000001");
    expect(sanitizeNikInput("12345678901234567890")).toBe("1234567890123456");
    expect(sanitizeNikInput("abc")).toBe("");
  });
});

describe("registrationProblems", () => {
  it("menggabungkan masalah email dan NIK; kosong bila siap direview", () => {
    expect(registrationProblems({ email: "you@", nik: "" })).toEqual({ email: "invalid", nik: "required" });
    expect(registrationProblems({ email: "you@example.com", nik: "0000000000000001" })).toEqual({});
  });
});

describe("emailProblem", () => {
  it("kosong atau spasi: required", () => {
    expect(emailProblem("")).toBe("required");
    expect(emailProblem("   ")).toBe("required");
  });

  it("format salah: invalid", () => {
    expect(emailProblem("you@")).toBe("invalid");
    expect(emailProblem("you@example")).toBe("invalid");
    expect(emailProblem("you example@x.com")).toBe("invalid");
  });

  it("format benar, termasuk spasi di tepi: tanpa masalah", () => {
    expect(emailProblem("you@example.com")).toBeUndefined();
    expect(emailProblem("  you@example.com ")).toBeUndefined();
  });
});

describe("isValidNik", () => {
  it("tepat 16 digit, nol di depan dipertahankan", () => {
    expect(isValidNik("0000000000000001")).toBe(true);
    expect(isValidNik("317100000000001")).toBe(false);
    expect(isValidNik("31710000000000012")).toBe(false);
    expect(isValidNik("3171-00000000001")).toBe(false);
  });
});

describe("resolveReturnTo", () => {
  it("path same-origin diterima apa adanya", () => {
    expect(resolveReturnTo("/events/evt-1/queue")).toBe("/events/evt-1/queue");
    expect(resolveReturnTo("/orders/RB-1/pay?x=1")).toBe("/orders/RB-1/pay?x=1");
  });

  it.each([null, undefined, "", "https://evil.test", "//evil.test", "/\\evil.test", "events"])("menolak %s", (raw) => {
    expect(resolveReturnTo(raw)).toBe("/");
  });

  it("halaman auth diganti fallback agar tidak berputar", () => {
    expect(resolveReturnTo("/login")).toBe("/");
    expect(resolveReturnTo("/login?returnTo=/x")).toBe("/");
    expect(resolveReturnTo("/auth/callback?token=t")).toBe("/");
    expect(resolveReturnTo("/register")).toBe("/");
    expect(resolveReturnTo("/loginx")).toBe("/loginx");
  });

  it("fallback bisa diganti", () => {
    expect(resolveReturnTo(null, "/akun")).toBe("/akun");
  });
});
