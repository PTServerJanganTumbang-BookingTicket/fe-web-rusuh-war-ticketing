import { describe, expect, it, vi } from "vitest";
import type { AppError } from "@rusuh/core";
import type { RegisterScreenState } from "../registerModel";
import { toRegisterViewProps } from "../toRegisterViewProps";

const actions = {
  changeEmail: vi.fn(),
  changeNik: vi.fn(),
  submit: vi.fn(),
  confirm: vi.fn(),
  closeDialog: vi.fn(),
  goToLogin: vi.fn(),
  resend: vi.fn(),
  simulateOpenLink: vi.fn(),
};
const view = (state: RegisterScreenState) => toRegisterViewProps({ state, actions });
const editing = (overrides: Partial<Extract<RegisterScreenState, { kind: "editing" }>> = {}): RegisterScreenState => ({
  kind: "editing",
  mode: "register",
  email: "new@example.com",
  nik: "0012345678901234",
  problems: {},
  submitting: false,
  ...overrides,
});
const failed = (error: AppError) => view(editing({ dialog: { kind: "failed", error } })).dialog;

describe("toRegisterViewProps: form", () => {
  it("email dan NIK dengan penghitung, catatan Dukcapil, dan tautan masuk", () => {
    const props = view(editing({ nik: "0012" }));
    if (props.content.kind !== "form") throw new Error("harus form");
    expect(props.content.nik).toMatchObject({ label: "NIK (Nomor Induk Kependudukan)", counter: "4/16" });
    expect(props.content.note).toContain("Dukcapil");
    expect(props.content.review.label).toBe("Periksa Data");
    expect(props.content.footer.link).toEqual({ label: "Masuk", href: "/login" });
    expect(props.dialog).toBeUndefined();
  });

  it("galat di samping field", () => {
    const props = view(editing({ problems: { email: "invalid", nik: "required" } }));
    if (props.content.kind !== "form") throw new Error("harus form");
    expect(props.content.email.error).toBe("Masukkan alamat email yang valid.");
    expect(props.content.nik?.error).toBe("NIK wajib diisi.");
  });

  it("mode resend: tanpa NIK, tombol kirim ulang", () => {
    const props = view(editing({ mode: "resend" }));
    if (props.content.kind !== "form") throw new Error("harus form");
    expect(props.content.nik).toBeUndefined();
    expect(props.content.review.label).toBe("Kirim Ulang Email Verifikasi");
  });
});

describe("toRegisterViewProps: dialog", () => {
  it("review menampilkan email dan NIK utuh (nol di depan) dengan konfirmasi dan ubah data", () => {
    const dialog = view(editing({ dialog: { kind: "review" } })).dialog;
    expect(dialog?.rows).toEqual([
      { label: "Alamat email", value: "new@example.com" },
      { label: "NIK", value: "0012345678901234" },
    ]);
    expect(dialog).toMatchObject({ dismissible: true, primary: { label: "Konfirmasi dan Daftar" }, secondary: { label: "Ubah Data" } });
  });

  it("submitting: terkunci dan tidak bisa ditutup", () => {
    const dialog = view(editing({ dialog: { kind: "submitting" } })).dialog;
    expect(dialog).toMatchObject({ dismissible: false, primary: { disabled: true }, secondary: { disabled: true } });
    expect(dialog?.note).toContain("Dukcapil");
  });

  it("email sudah terdaftar: masuk atau ganti email", () => {
    const dialog = failed({ kind: "api", code: "EMAIL_ALREADY_REGISTERED", status: 409 });
    expect(dialog).toMatchObject({ title: "Email sudah terdaftar", primary: { label: "Masuk" }, secondary: { label: "Ganti Email" } });
    dialog?.primary.onClick();
    expect(actions.goToLogin).toHaveBeenCalledTimes(1);
  });

  it("NIK tidak cocok: hanya ubah data, tanpa coba lagi", () => {
    const dialog = failed({ kind: "api", code: "NIK_MISMATCH", status: 422 });
    expect(dialog).toMatchObject({ title: "Periksa NIK kamu", primary: { label: "Ubah Data" } });
    expect(dialog?.secondary).toBeUndefined();
  });

  it("Dukcapil tidak tersedia: coba lagi atau ubah data", () => {
    const dialog = failed({ kind: "api", code: "NIK_VERIFICATION_UNAVAILABLE", status: 503 });
    expect(dialog).toMatchObject({ primary: { label: "Coba Lagi" }, secondary: { label: "Ubah Data" } });
    dialog?.primary.onClick();
    expect(actions.confirm).toHaveBeenCalledTimes(1);
  });

  it("gagal lain: pesan umum dengan coba lagi dan tutup; rate limit memakai detik", () => {
    expect(failed({ kind: "network" })).toMatchObject({ title: "Registrasi gagal", secondary: { label: "Tutup" } });
    expect(failed({ kind: "api", code: "RATE_LIMITED", status: 429, retryAfterMs: 12_000 })?.description).toBe(
      "Terlalu banyak percobaan. Coba lagi dalam 12 detik.",
    );
  });
});

describe("toRegisterViewProps: terdaftar", () => {
  const sent = { email: "new@example.com", resendAvailableAt: "x", serverNow: "x" };

  it("langkah verifikasi, kirim ulang menunggu jeda", () => {
    const props = view({ kind: "registered", mode: "register", sent, resendInMs: 9_100, resending: false });
    if (props.content.kind !== "registered") throw new Error("harus registered");
    expect(props.content.message).toContain("new@example.com");
    expect(props.content.steps).toHaveLength(3);
    expect(props.content.resend).toMatchObject({ label: "Kirim ulang dalam 10 dtk", disabled: true });
    expect(props.content.goToLogin.href).toBe("/login");
  });

  it("mode resend memakai judul link terkirim", () => {
    const props = view({ kind: "registered", mode: "resend", sent, resendInMs: 0, resending: false });
    expect(props.content.kind === "registered" && props.content.heading).toBe("Link verifikasi terkirim");
  });
});
