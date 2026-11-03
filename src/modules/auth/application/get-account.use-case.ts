import type { Account } from "../domain/account.model";
import type { AuthProtocol } from "../domain/auth.protocol";

export type GetAccountUseCase = () => Promise<Account | null>;

/** Akun yang sedang masuk, atau `null` untuk tamu. */
export function createGetAccountUseCase({ authService }: { authService: AuthProtocol }): GetAccountUseCase {
  return () => authService.getAccount();
}
