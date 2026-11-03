import type { SavedNikProtocol } from "../domain/saved-nik.protocol";

export type RemoveSavedNikUseCase = (id: string) => Promise<void>;

/** Menghapus NIK teman. */
export function createRemoveSavedNikUseCase({
  savedNikService,
}: {
  savedNikService: SavedNikProtocol;
}): RemoveSavedNikUseCase {
  return (id) => savedNikService.remove(id);
}
