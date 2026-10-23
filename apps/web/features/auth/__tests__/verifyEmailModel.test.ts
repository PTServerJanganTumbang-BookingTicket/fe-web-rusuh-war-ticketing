import { describe, expect, it } from "vitest";
import { deriveVerifyEmailScreenState } from "../verifyEmailModel";

describe("deriveVerifyEmailScreenState", () => {
  it("menunggu jawaban: verifying", () => {
    expect(deriveVerifyEmailScreenState({ verified: false, error: undefined })).toEqual({ kind: "verifying" });
  });

  it("berhasil: verified", () => {
    expect(deriveVerifyEmailScreenState({ verified: true, error: undefined })).toEqual({ kind: "verified" });
  });

  it("galat: failed membawa AppError", () => {
    const error = { kind: "network" } as const;
    expect(deriveVerifyEmailScreenState({ verified: false, error })).toEqual({ kind: "failed", error });
  });
});
