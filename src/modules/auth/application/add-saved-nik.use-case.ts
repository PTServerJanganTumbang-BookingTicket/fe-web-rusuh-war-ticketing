import { AppFailure } from "@/core/domain/app-error";
import type { SavedNikInput } from "../domain/account.model";
import { validateSavedNikInput } from "../domain/account.rules";
import type { SavedNikProtocol } from "../domain/saved-nik.protocol";

export type AddSavedNikUseCase = (input: SavedNikInput) => Promise<void>;

/** Menyimpan alias (nama panggilan dan NIK). Dukcapil dicek sekali di sini, bukan saat checkout. */
export function createAddSavedNikUseCase({
  savedNikService,
}: {
  savedNikService: SavedNikProtocol;
}): AddSavedNikUseCase {
  return (input) => {
    const cleaned = { label: input.label.trim(), nik: input.nik };
    if (validateSavedNikInput(cleaned)) {
      return Promise.reject(new AppFailure({ kind: "api", code: "NIK_INVALID", status: 400 }));
    }
    return savedNikService.add(cleaned);
  };
}
