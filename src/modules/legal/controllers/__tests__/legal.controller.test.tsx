// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "@/test/support";
import { useLegalController } from "../legal.controller";

describe("useLegalController", () => {
  it("Syarat dan Ketentuan: lima bagian bernomor, versi, dan tautan ke Kebijakan Privasi", () => {
    const { result } = renderHook(() => useLegalController("terms"), { wrapper: createWrapper() });
    expect(result.current.header.heading).toBe("Syarat dan Ketentuan");
    expect(result.current.sections).toHaveLength(5);
    expect(result.current.sections.every((section) => section.title && section.body)).toBe(true);
    expect(result.current.version).toBe("Versi 2026-10-01");
    expect(result.current.other).toEqual({ label: "Kebijakan Privasi", href: "/privacy" });
    expect(result.current.notice).toContain("tim hukum");
  });

  it("Kebijakan Privasi: menyebut NIK orang lain dan menaut balik ke Syarat dan Ketentuan", () => {
    const { result } = renderHook(() => useLegalController("privacy"), { wrapper: createWrapper() });
    expect(result.current.header.heading).toBe("Kebijakan Privasi");
    expect(result.current.sections.map((section) => section.title)).toContain("NIK orang lain");
    expect(result.current.other.href).toBe("/terms");
  });

  it("footer membawa tautan dokumen hukum", () => {
    const { result } = renderHook(() => useLegalController("terms"), { wrapper: createWrapper() });
    expect(result.current.footer.links).toEqual([
      { label: "Syarat dan Ketentuan", href: "/terms" },
      { label: "Kebijakan Privasi", href: "/privacy" },
    ]);
  });
});
