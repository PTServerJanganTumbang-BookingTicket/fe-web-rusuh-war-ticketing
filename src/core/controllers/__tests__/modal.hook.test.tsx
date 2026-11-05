// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useModal } from "../modal.hook";

describe("useModal", () => {
  it("membuka satu modal beserta datanya, lalu menutup", () => {
    const { result } = renderHook(() => useModal<{ kind: "a" | "b"; slot: string }>());
    expect(result.current.modal).toBeNull();
    act(() => result.current.open({ kind: "a", slot: "x" }));
    expect(result.current.modal).toEqual({ kind: "a", slot: "x" });
    act(() => result.current.open({ kind: "b", slot: "y" }));
    expect(result.current.modal).toEqual({ kind: "b", slot: "y" });
    act(() => result.current.close());
    expect(result.current.modal).toBeNull();
  });
});
