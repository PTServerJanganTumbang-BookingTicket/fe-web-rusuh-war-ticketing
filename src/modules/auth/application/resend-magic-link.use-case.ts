import type { AuthProtocol } from "../domain/auth.protocol";

export type ResendMagicLinkUseCase = (email: string) => Promise<void>;

/** Mengirim ulang link login. Requirement: FR-29. */
export function createResendMagicLinkUseCase({
  authService,
}: {
  authService: AuthProtocol;
}): ResendMagicLinkUseCase {
  return (email) => authService.resendMagicLink(email.trim());
}
