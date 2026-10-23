import { registrationProblems, type RegistrationInput, type RegistrationProblems } from "../auth/validation";
import type { EmailLinkSent } from "../domain/account";
import type { RegisterAccount } from "./ports";

export type RegisterAccountDeps = { registerAccount: RegisterAccount };

export type RegisterAccountResult = { status: "invalid"; problems: RegistrationProblems } | { status: "registered"; sent: EmailLinkSent };

/**
 * Registrasi (Figma SJT ZAKI, frame Registration dan Confirmation). Dipanggil hanya dari "Konfirmasi dan Daftar" setelah
 * review; input yang tidak valid tidak dikirim. NIK dikirim sebagai string agar nol di depan tidak hilang (ADR-0011).
 * Kegagalan port (EMAIL_ALREADY_REGISTERED, NIK_MISMATCH, NIK_VERIFICATION_UNAVAILABLE, ...) dilempar apa adanya.
 */
export async function registerAccount(deps: RegisterAccountDeps, input: RegistrationInput): Promise<RegisterAccountResult> {
  const problems = registrationProblems(input);
  if (problems.email || problems.nik) return { status: "invalid", problems };
  return { status: "registered", sent: await deps.registerAccount(input.email.trim(), input.nik) };
}
