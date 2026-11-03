import type { SavedNikList } from "../domain/account.model";
import type { SavedNikProtocol } from "../domain/saved-nik.protocol";

export type ListSavedNiksUseCase = () => Promise<SavedNikList>;

/** Daftar NIK teman milik akun. */
export function createListSavedNiksUseCase({
  savedNikService,
}: {
  savedNikService: SavedNikProtocol;
}): ListSavedNiksUseCase {
  return () => savedNikService.list();
}
