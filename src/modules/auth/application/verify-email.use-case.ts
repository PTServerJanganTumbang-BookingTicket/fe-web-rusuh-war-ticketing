import type { AuthProtocol } from "../domain/auth.protocol";

export type VerifyEmailUseCase = (token: string) => Promise<void>;

/** Mengonfirmasi kepemilikan email dari tautan pendaftaran. Tidak membuat sesi. Requirement: FR-31. */
export function createVerifyEmailUseCase({ authService }: { authService: AuthProtocol }): VerifyEmailUseCase {
  return (token) => authService.verifyEmail(token);
}
