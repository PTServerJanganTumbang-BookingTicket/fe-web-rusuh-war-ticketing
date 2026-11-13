import { describe, expect, it, vi } from "vitest";
import { toNikMismatchDialog, toNikUnavailableDialog } from "../nik-dialog.mapper";

describe("toNikUnavailableDialog", () => {
  it("coba lagi sebagai aksi utama, ubah data sebagai cadangan", () => {
    const onRetry = vi.fn();
    const onEdit = vi.fn();
    const dialog = toNikUnavailableDialog({ onRetry, onEdit, onDismiss: vi.fn(), retrying: true });
    expect(dialog).toMatchObject({
      tone: "error",
      illustration: "error",
      title: "Verifikasi NIK belum tersedia",
      primary: { label: "Coba lagi", busy: true },
      secondary: { label: "Ubah data" },
    });
    if ("onClick" in dialog.primary) dialog.primary.onClick();
    expect(onRetry).toHaveBeenCalledWith();
  });
});

describe("toNikMismatchDialog", () => {
  it("hanya ubah data, tanpa coba lagi langsung", () => {
    const onEdit = vi.fn();
    const dialog = toNikMismatchDialog({ onEdit, onDismiss: vi.fn() });
    expect(dialog.title).toBe("Periksa NIK-mu");
    expect(dialog.illustration).toBe("confirmation");
    expect(dialog.primary.label).toBe("Ubah data");
    expect(dialog.secondary).toBeUndefined();
    if ("onClick" in dialog.primary) dialog.primary.onClick();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
