import { describe, expect, it } from "vitest";
import { deriveRegisterScreenState, type RegisterScreenInput } from "../registerModel";

const sent = { email: "new@example.com", resendAvailableAt: "2026-10-23T10:00:30.000Z", serverNow: "2026-10-23T10:00:00.000Z" };
const mismatch = { kind: "api", code: "NIK_MISMATCH", status: 422 } as const;

const input = (overrides: Partial<RegisterScreenInput>): RegisterScreenInput => ({
  mode: "register",
  email: "new@example.com",
  nik: "3171000000000001",
  problems: {},
  reviewing: false,
  submitting: false,
  submitError: undefined,
  sent: undefined,
  resendInMs: null,
  resending: false,
  resendError: undefined,
  simulation: undefined,
  ...overrides,
});

describe("deriveRegisterScreenState", () => {
  it("form tanpa dialog sebelum review", () => {
    expect(deriveRegisterScreenState(input({}))).toEqual({
      kind: "editing",
      mode: "register",
      email: "new@example.com",
      nik: "3171000000000001",
      problems: {},
      submitting: false,
    });
  });

  it("dialog: review → submitting → failed, satu dialog untuk satu kejadian", () => {
    expect(deriveRegisterScreenState(input({ reviewing: true }))).toMatchObject({ dialog: { kind: "review" } });
    expect(deriveRegisterScreenState(input({ reviewing: true, submitting: true }))).toMatchObject({ dialog: { kind: "submitting" } });
    expect(deriveRegisterScreenState(input({ reviewing: true, submitError: mismatch }))).toMatchObject({ dialog: { kind: "failed", error: mismatch } });
  });

  it("NIK_INVALID dari BE kembali ke field NIK, tanpa dialog", () => {
    const state = deriveRegisterScreenState(input({ reviewing: true, submitError: { kind: "api", code: "NIK_INVALID", status: 422 } }));
    expect(state).toMatchObject({ kind: "editing", problems: { nik: "invalid" } });
    expect(state.kind === "editing" && state.dialog).toBeUndefined();
  });

  it("mode resend: galat tampil di atas form, tanpa dialog", () => {
    const error = { kind: "network" } as const;
    const state = deriveRegisterScreenState(input({ mode: "resend", submitError: error }));
    expect(state).toMatchObject({ kind: "editing", mode: "resend", error });
    expect(state.kind === "editing" && state.dialog).toBeUndefined();
  });

  it("terdaftar: registered dengan jeda kirim ulang dan kontrol simulasi", () => {
    expect(deriveRegisterScreenState(input({ sent, resendInMs: 20_000, simulation: { busy: false } }))).toEqual({
      kind: "registered",
      mode: "register",
      sent,
      resendInMs: 20_000,
      resending: false,
      simulation: { busy: false },
    });
  });
});
