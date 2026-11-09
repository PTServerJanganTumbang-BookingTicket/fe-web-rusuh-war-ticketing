import { describe, expect, it, vi } from "vitest";
import {
  isUnexpectedError,
  toConnectionProblemDialog,
  toRequestFailedDialog,
  toSessionExpiredDialog,
  toSomethingWentWrongDialog,
} from "../common-dialogs.mapper";

const actions = () => ({ onRetry: vi.fn(), onDismiss: vi.fn() });

describe("dialog umum", () => {
  it("koneksi bermasalah: satu aksi coba lagi", () => {
    const options = actions();
    const dialog = toConnectionProblemDialog({ ...options, retrying: true });
    expect(dialog).toMatchObject({
      tone: "error",
      title: "Tidak ada jaringan",
      illustration: "network",
      primary: { label: "Coba lagi", busy: true },
    });
    expect(dialog.secondary).toBeUndefined();
    if ("onClick" in dialog.primary) dialog.primary.onClick();
    expect(options.onRetry).toHaveBeenCalledTimes(1);
  });

  it("terjadi kesalahan: satu aksi coba lagi", () => {
    expect(toSomethingWentWrongDialog(actions()).title).toBe("Terjadi kesalahan");
  });

  it("galat tanpa dialog khusus: koneksi untuk jaringan, selain itu terjadi kesalahan", () => {
    expect(toRequestFailedDialog({ kind: "network" }, actions()).title).toBe("Tidak ada jaringan");
    expect(toRequestFailedDialog({ kind: "unknown", status: 500 }, actions()).title).toBe(
      "Terjadi kesalahan",
    );
  });

  it("sesi berakhir: nada peringatan, masuk lagi lewat tautan, tutup sebagai cadangan", () => {
    const onDismiss = vi.fn();
    const dialog = toSessionExpiredDialog({ onDismiss });
    expect(dialog).toMatchObject({
      tone: "warning",
      icon: "clock",
      title: "Sesi berakhir",
      primary: { label: "Masuk lagi", href: "/login?session=expired" },
      secondary: { label: "Tutup" },
    });
    if (dialog.secondary && "onClick" in dialog.secondary) dialog.secondary.onClick();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("hanya galat tak terduga yang jadi dialog umum", () => {
    expect(isUnexpectedError({ kind: "network" })).toBe(true);
    expect(isUnexpectedError({ kind: "unknown" })).toBe(true);
    expect(isUnexpectedError({ kind: "invalid_response" })).toBe(true);
    expect(isUnexpectedError({ kind: "api", code: "RATE_LIMITED", status: 429 })).toBe(false);
  });
});
