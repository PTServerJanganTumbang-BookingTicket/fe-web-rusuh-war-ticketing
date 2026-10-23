import { describe, expect, it, vi } from "vitest";
import type { VerifyEmailScreenState } from "../verifyEmailModel";
import { toVerifyEmailViewProps } from "../toVerifyEmailViewProps";

const actions = { goToLogin: vi.fn(), requestNewEmail: vi.fn() };
const view = (state: VerifyEmailScreenState) => toVerifyEmailViewProps({ state, actions });

describe("toVerifyEmailViewProps", () => {
  it("verifying: status netral tanpa tombol", () => {
    expect(view({ kind: "verifying" })).toEqual({ title: "Verifikasi Email", message: "Memverifikasi emailmu…", tone: "neutral" });
  });

  it("verified: lanjut ke halaman masuk", () => {
    const props = view({ kind: "verified" });
    expect(props).toMatchObject({ title: "Email terverifikasi", action: { label: "Lanjut ke Masuk" } });
    props.action?.onClick();
    expect(actions.goToLogin).toHaveBeenCalledTimes(1);
  });

  it("failed: pesan per galat dan tombol kirim ulang email verifikasi", () => {
    const props = view({ kind: "failed", error: { kind: "api", code: "VERIFICATION_LINK_INVALID", status: 410 } });
    expect(props).toMatchObject({ tone: "error", message: expect.stringContaining("kedaluwarsa") });
    props.action?.onClick();
    expect(actions.requestNewEmail).toHaveBeenCalledTimes(1);
    expect(view({ kind: "failed", error: { kind: "network" } }).message).toContain("Koneksi bermasalah");
  });
});
