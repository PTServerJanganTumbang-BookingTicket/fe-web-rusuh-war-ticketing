import { describe, expect, it, vi } from "vitest";
import type { LoginScreenState } from "../loginModel";
import { toLoginViewProps } from "../toLoginViewProps";

const actions = {
  changeEmail: vi.fn(),
  submit: vi.fn(),
  resend: vi.fn(),
  editEmail: vi.fn(),
  simulateOpenLink: vi.fn(),
  proceed: vi.fn(),
  logout: vi.fn(),
};
const view = (state: LoginScreenState) => toLoginViewProps({ state, actions });
const sent = { email: "alex@example.com", resendAvailableAt: "2026-10-23T10:00:30.000Z", serverNow: "2026-10-23T10:00:00.000Z" };

describe("toLoginViewProps", () => {
  it("form: label, hint, dan tombol kirim link", () => {
    const props = view({ kind: "editing", email: "", submitting: false });
    if (props.content.kind !== "form") throw new Error("harus form");
    expect(props.content.email).toMatchObject({ label: "Alamat email", hint: "Kami kirim link aman ke email ini." });
    expect(props.content.email.error).toBeUndefined();
    expect(props.content.submit).toMatchObject({ label: "Kirim Link Login", disabled: false });
    expect(props.notice).toBeUndefined();
  });

  it("form: email kosong dan salah format memakai pesan i18n", () => {
    const required = view({ kind: "editing", email: "", problem: "required", submitting: false });
    const invalid = view({ kind: "editing", email: "you@", problem: "invalid", submitting: false });
    expect(required.content.kind === "form" && required.content.email.error).toBe("Alamat email wajib diisi.");
    expect(invalid.content.kind === "form" && invalid.content.email.error).toBe("Masukkan alamat email yang valid.");
  });

  it("form: sesi dicabut di perangkat lain tampil sebagai peringatan", () => {
    expect(view({ kind: "editing", email: "", submitting: false, reason: "revoked" }).notice).toMatchObject({
      tone: "warning",
      message: expect.stringContaining("perangkat lain"),
    });
  });

  it("form: rate limit memakai detik dari Retry-After, mengalahkan alasan", () => {
    const props = view({
      kind: "editing",
      email: "a@b.co",
      submitting: false,
      reason: "required",
      error: { kind: "api", code: "RATE_LIMITED", status: 429, retryAfterMs: 28_000 },
    });
    expect(props.notice).toEqual({ tone: "error", message: "Terlalu banyak permintaan. Coba lagi dalam 28 detik." });
  });

  it("sent: kirim ulang menunggu jeda, lalu aktif", () => {
    const waiting = view({ kind: "sent", sent, resendInMs: 12_400, resending: false });
    if (waiting.content.kind !== "sent") throw new Error("harus sent");
    expect(waiting.content.message).toContain("alex@example.com");
    expect(waiting.content.resend).toMatchObject({ label: "Kirim ulang dalam 13 dtk", disabled: true });
    expect(waiting.content.mockOpenLink).toBeUndefined();

    const ready = view({ kind: "sent", sent, resendInMs: 0, resending: false, simulation: { busy: false } });
    if (ready.content.kind !== "sent") throw new Error("harus sent");
    expect(ready.content.resend).toMatchObject({ label: "Kirim Ulang Link", disabled: false });
    ready.content.mockOpenLink?.onClick();
    expect(actions.simulateOpenLink).toHaveBeenCalledTimes(1);
  });

  it("signedIn: lanjutkan dan keluar", () => {
    const props = view({ kind: "signedIn", account: { email: "alex@example.com", maskedNik: "x", emailVerified: true }, loggingOut: false });
    if (props.content.kind !== "signedIn") throw new Error("harus signedIn");
    expect(props.content.message).toBe("Masuk sebagai alex@example.com.");
    props.content.logout.onClick();
    expect(actions.logout).toHaveBeenCalledTimes(1);
  });
});
