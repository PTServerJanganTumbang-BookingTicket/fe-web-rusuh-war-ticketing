import type { SessionAccount } from "@/core/domain/session-account.model";
import type { SessionAccountProtocol } from "@/core/domain/session-account.protocol";

export type GetSessionAccountUseCase = () => Promise<SessionAccount | null>;

/** Akun yang sedang masuk untuk navbar, atau `null` untuk tamu. */
export function createGetSessionAccountUseCase({
  sessionAccountService,
}: {
  sessionAccountService: SessionAccountProtocol;
}): GetSessionAccountUseCase {
  return () => sessionAccountService.current();
}
