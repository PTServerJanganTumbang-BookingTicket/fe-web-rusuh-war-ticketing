import type { HolderAlias } from "./holder-alias.model";

/** Alias pemegang tiket milik akun. Tamu tidak punya alias (401 dari route same-origin). */
export interface HolderAliasProtocol {
  list(): Promise<HolderAlias[]>;
}
