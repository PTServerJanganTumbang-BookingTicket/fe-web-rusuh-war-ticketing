import type { AuthProtocol } from "../domain/auth.protocol";

export type ResendVerificationUseCase = (email: string) => Promise<void>;

/** Kirim ulang email verifikasi pendaftaran. Requirement: FR-31. */
export function createResendVerificationUseCase({
  authService,
}: {
  authService: AuthProtocol;
}): ResendVerificationUseCase {
  return (email) => authService.resendVerification(email.trim());
}
