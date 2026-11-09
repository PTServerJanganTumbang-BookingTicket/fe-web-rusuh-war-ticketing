// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAskServerAtExpiry } from "../ask-server-at-expiry.hook";

describe("useAskServerAtExpiry", () => {
  it("tidak bertanya selama waktu masih berjalan atau belum ada batas waktu", () => {
    const ask = vi.fn();
    renderHook(() => useAskServerAtExpiry("2026-10-19T10:05:00Z", 1000, ask));
    renderHook(() => useAskServerAtExpiry(undefined, 0, ask));
    renderHook(() => useAskServerAtExpiry("2026-10-19T10:05:00Z", null, ask));
    expect(ask).not.toHaveBeenCalled();
  });

  it("bertanya ke server sekali saat sisa waktu nol, bukan tiap render", () => {
    const ask = vi.fn();
    const { rerender } = renderHook(
      ({ remaining }) => useAskServerAtExpiry("2026-10-19T10:05:00Z", remaining, ask),
      { initialProps: { remaining: 1000 } },
    );
    rerender({ remaining: 0 });
    rerender({ remaining: 0 });
    expect(ask).toHaveBeenCalledOnce();
  });

  it("batas waktu baru (grant baru) boleh ditanyakan lagi", () => {
    const ask = vi.fn();
    const { rerender } = renderHook(({ at }) => useAskServerAtExpiry(at, 0, ask), {
      initialProps: { at: "2026-10-19T10:05:00Z" },
    });
    rerender({ at: "2026-10-19T10:15:00Z" });
    expect(ask).toHaveBeenCalledTimes(2);
  });
});
