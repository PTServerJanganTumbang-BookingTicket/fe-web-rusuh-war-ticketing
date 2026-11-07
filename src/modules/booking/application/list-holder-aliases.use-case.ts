import type { HolderAlias } from "../domain/holder-alias.model";
import type { HolderAliasProtocol } from "../domain/holder-alias.protocol";

export type ListHolderAliasesUseCase = () => Promise<HolderAlias[]>;

/** Alias akun untuk pilihan pemegang tiket di Detail Ticket. */
export function createListHolderAliasesUseCase({
  holderAliasService,
}: {
  holderAliasService: HolderAliasProtocol;
}): ListHolderAliasesUseCase {
  return () => holderAliasService.list();
}
