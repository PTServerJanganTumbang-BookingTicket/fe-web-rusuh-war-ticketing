import type { LoginResult } from "../domain/account.model";
import type { AuthProtocol } from "../domain/auth.protocol";

export type VerifyLoginUseCase = (token: string) => Promise<LoginResult>;

/** Menukar token link email dengan sesi akun (ADR-0023). */
export function createVerifyLoginUseCase({ authService }: { authService: AuthProtocol }): VerifyLoginUseCase {
  return (token) => authService.verify(token);
}
