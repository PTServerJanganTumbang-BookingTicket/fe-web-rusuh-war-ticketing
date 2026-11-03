import type { AuthProtocol } from "../domain/auth.protocol";

export type RequestMagicLinkUseCase = (email: string) => Promise<void>;

/** Mengirim link login ke email. Requirement: FR-29. */
export function createRequestMagicLinkUseCase({
  authService,
}: {
  authService: AuthProtocol;
}): RequestMagicLinkUseCase {
  return (email) => authService.requestMagicLink(email.trim());
}
