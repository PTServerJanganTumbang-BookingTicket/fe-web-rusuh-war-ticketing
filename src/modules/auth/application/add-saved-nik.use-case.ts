import { AppFailure } from "@/core/domain/app-error";
import { validateSavedNikInput } from "../domain/account.rules";
import type { SavedNikProtocol } from "../domain/saved-nik.protocol";

export type AddSavedNikUseCase = (nik: string, label: string) => Promise<void>;

/** Menyimpan alias. Dukcapil dicek sekali di sini, bukan saat checkout. */
export function createAddSavedNikUseCase({
  savedNikService,
}: {
  savedNikService: SavedNikProtocol;
}): AddSavedNikUseCase {
  return (nik, label) => {
    const cleaned = { label: label.trim(), nik };
    if (validateSavedNikInput(cleaned, { mode: "create" })) {
      return Promise.reject(new AppFailure({ kind: "api", code: "NIK_INVALID", status: 400 }));
    }
    return savedNikService.add(cleaned.nik, cleaned.label);
  };
}
