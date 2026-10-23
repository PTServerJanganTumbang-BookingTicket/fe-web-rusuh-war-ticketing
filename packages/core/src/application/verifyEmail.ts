import { AppFailure } from "../errors/appError";
import type { VerifyEmail } from "./ports";

export type VerifyEmailDeps = { verifyEmail: VerifyEmail };

/** Membuka link verifikasi email. Link tanpa token diperlakukan sama dengan link tidak valid, tanpa memanggil BE. */
export async function verifyEmail(deps: VerifyEmailDeps, token: string | null): Promise<void> {
  if (!token) throw new AppFailure({ kind: "api", code: "VERIFICATION_LINK_INVALID", status: 400 });
  await deps.verifyEmail(token);
}
