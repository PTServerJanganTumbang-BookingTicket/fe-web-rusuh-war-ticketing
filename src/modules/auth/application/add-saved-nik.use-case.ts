import type { SavedNikProtocol } from "../domain/saved-nik.protocol";

export type AddSavedNikUseCase = (nik: string, label: string) => Promise<void>;

/** Menyimpan NIK teman. Dukcapil dicek sekali di sini, bukan saat checkout. */
export function createAddSavedNikUseCase({
  savedNikService,
}: {
  savedNikService: SavedNikProtocol;
}): AddSavedNikUseCase {
  return (nik, label) => savedNikService.add(nik, label.trim());
}
