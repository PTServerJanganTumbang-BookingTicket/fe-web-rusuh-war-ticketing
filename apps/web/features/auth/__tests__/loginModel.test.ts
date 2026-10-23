import { describe, expect, it } from "vitest";
import { deriveLoginScreenState, type LoginScreenInput } from "../loginModel";

const account = { email: "alex@example.com", maskedNik: "3171••••••••0001", emailVerified: true };
const sent = { email: "alex@example.com", resendAvailableAt: "2026-10-23T10:00:30.000Z", serverNow: "2026-10-23T10:00:00.000Z" };

const input = (overrides: Partial<LoginScreenInput>): LoginScreenInput => ({
  account: undefined,
  checking: false,
  email: "",
  problem: undefined,
  sent: undefined,
  sending: false,
  sendError: undefined,
  resendInMs: null,
  loggingOut: false,
  reason: undefined,
  simulation: undefined,
  ...overrides,
});

describe("deriveLoginScreenState", () => {
  it("sudah login: signedIn, mengalahkan status lain", () => {
    expect(deriveLoginScreenState(input({ account, checking: true, sent }))).toEqual({ kind: "signedIn", account, loggingOut: false });
  });

  it("/me belum menjawab: checking", () => {
    expect(deriveLoginScreenState(input({ checking: true }))).toEqual({ kind: "checking" });
  });

  it("belum login: editing dengan alasan dan masalah email", () => {
    expect(deriveLoginScreenState(input({ email: "you@", problem: "invalid", reason: "revoked" }))).toEqual({
      kind: "editing",
      email: "you@",
      problem: "invalid",
      submitting: false,
      reason: "revoked",
    });
  });

  it("link terkirim: sent dengan sisa jeda kirim ulang; timer belum siap dianggap 0", () => {
    expect(deriveLoginScreenState(input({ sent, resendInMs: 12_000 }))).toEqual({ kind: "sent", sent, resendInMs: 12_000, resending: false });
    expect(deriveLoginScreenState(input({ sent })).kind === "sent" && deriveLoginScreenState(input({ sent }))).toMatchObject({ resendInMs: 0 });
  });

  it("galat kirim ulang dan kontrol simulasi ikut ke sent", () => {
    const error = { kind: "api", code: "RATE_LIMITED", status: 429, retryAfterMs: 5000 } as const;
    expect(deriveLoginScreenState(input({ sent, sendError: error, simulation: { busy: false } }))).toMatchObject({
      kind: "sent",
      error,
      simulation: { busy: false },
    });
  });
});
