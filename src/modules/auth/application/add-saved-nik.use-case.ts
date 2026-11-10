import { AppFailure } from "@/core/domain/app-error";
import type { SavedNikInput } from "../domain/account.model";
import { savedNikLabelOf, validateSavedNikInput } from "../domain/account.rules";
import type { SavedNikProtocol } from "../domain/saved-nik.protocol";

export type AddSavedNikUseCase = (input: SavedNikInput) => Promise<void>;

/** Menyimpan alias (nama panggilan dan NIK). Dukcapil dicek sekali di sini, bukan saat checkout. */
export function createAddSavedNikUseCase({
  savedNikService,
}: {
  savedNikService: SavedNikProtocol;
}): AddSavedNikUseCase {
  return (input) => {
    if (validateSavedNikInput(input)) {
      return Promise.reject(new AppFailure({ kind: "api", code: "NIK_INVALID", status: 400 }));
    }
    return savedNikService.add({ label: savedNikLabelOf(input.label, input.nik), nik: input.nik });
  };
}
