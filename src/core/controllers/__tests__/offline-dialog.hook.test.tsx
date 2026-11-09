// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useOfflineDialog } from "../offline-dialog.hook";

const setOnline = (online: boolean) => {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: online });
  act(() => {
    window.dispatchEvent(new Event(online ? "online" : "offline"));
  });
};

afterEach(() => setOnline(true));

describe("useOfflineDialog", () => {
  it("online: tidak ada dialog", () => {
    const { result } = renderHook(() => useOfflineDialog());
    expect(result.current).toBeUndefined();
  });

  it("offline: dialog tanpa jaringan dengan ilustrasi dan teks dari spreadsheet, hilang sendiri saat online", () => {
    const { result } = renderHook(() => useOfflineDialog());
    setOnline(false);
    expect(result.current).toMatchObject({
      tone: "error",
      illustration: "network",
      title: "Tidak ada jaringan",
      description: "Anda terputus, periksa koneksi internet anda",
    });
    setOnline(true);
    expect(result.current).toBeUndefined();
  });

  it("ditutup customer: tidak muncul lagi sampai putus koneksi berikutnya", () => {
    const { result } = renderHook(() => useOfflineDialog());
    setOnline(false);
    act(() => result.current?.onDismiss());
    expect(result.current).toBeUndefined();
    setOnline(true);
    setOnline(false);
    expect(result.current?.illustration).toBe("network");
  });
});
