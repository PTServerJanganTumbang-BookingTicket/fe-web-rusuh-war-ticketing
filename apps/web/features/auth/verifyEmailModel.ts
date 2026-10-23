import type { AppError } from "@rusuh/core";

// Kondisi layar membuka link verifikasi email (ADR-0017, Figma SJT ZAKI "Verification journey" dan Error H).

export type VerifyEmailScreenState = { kind: "verifying" } | { kind: "verified" } | { kind: "failed"; error: AppError };

export function deriveVerifyEmailScreenState({ verified, error }: { verified: boolean; error: AppError | undefined }): VerifyEmailScreenState {
  if (verified) return { kind: "verified" };
  return error ? { kind: "failed", error } : { kind: "verifying" };
}
