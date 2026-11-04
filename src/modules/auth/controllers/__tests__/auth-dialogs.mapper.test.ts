import { describe, expect, it, vi } from "vitest";
import {
  toAlreadyRegisteredDialog,
  toEmailVerificationFailedDialog,
  toLoginLinkFailedDialog,
  toRegistrationFailedDialog,
  toServiceUnavailableDialog,
} from "../auth-dialogs.mapper";

describe("dialog auth", () => {
  it("layanan tidak tersedia dan pendaftaran gagal: coba lagi dan tutup", () => {
    const options = { onRetry: vi.fn(), onDismiss: vi.fn() };
    for (const dialog of [toServiceUnavailableDialog(options), toRegistrationFailedDialog(options)]) {
      expect(dialog.primary.label).toBe("Coba lagi");
      expect(dialog.secondary?.label).toBe("Tutup");
    }
    expect(toServiceUnavailableDialog(options).title).toBe("Layanan sedang tidak tersedia");
    expect(toRegistrationFailedDialog(options).title).toBe("Pendaftaran gagal");
  });

  it("akun sudah terdaftar: masuk lewat tautan, ubah email sebagai cadangan", () => {
    const onEdit = vi.fn();
    const dialog = toAlreadyRegisteredDialog({ onEdit, onDismiss: vi.fn() });
    expect(dialog.primary).toEqual({ label: "Masuk", href: "/login" });
    if (dialog.secondary && "onClick" in dialog.secondary) dialog.secondary.onClick();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("verifikasi email gagal: kirim ulang sebagai satu-satunya aksi", () => {
    const onResend = vi.fn();
    const dialog = toEmailVerificationFailedDialog({ onResend, onDismiss: vi.fn(), resending: true });
    expect(dialog).toMatchObject({ title: "Verifikasi email gagal", primary: { busy: true } });
    expect(dialog.secondary).toBeUndefined();
  });

  it("link login gagal: minta link baru", () => {
    expect(toLoginLinkFailedDialog({ onDismiss: vi.fn() }).primary).toEqual({
      label: "Minta link login baru",
      href: "/login",
    });
  });
});
