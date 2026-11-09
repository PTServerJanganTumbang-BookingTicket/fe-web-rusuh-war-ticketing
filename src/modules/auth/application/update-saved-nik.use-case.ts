import { AppFailure } from "@/core/domain/app-error";
import type { SavedNikInput } from "../domain/account.model";
import { validateSavedNikInput } from "../domain/account.rules";
import type { SavedNikProtocol } from "../domain/saved-nik.protocol";

export type UpdateSavedNikUseCase = (id: string, input: SavedNikInput) => Promise<void>;

/** Mengubah nama panggilan dan, bila diisi, NIK alias. NIK baru dicek ulang Dukcapil di server. */
export function createUpdateSavedNikUseCase({
  savedNikService,
}: {
  savedNikService: SavedNikProtocol;
}): UpdateSavedNikUseCase {
  return (id, input) => {
    const cleaned = { label: input.label.trim(), nik: input.nik };
    if (validateSavedNikInput(cleaned, { mode: "edit" })) {
      return Promise.reject(new AppFailure({ kind: "api", code: "NIK_INVALID", status: 400 }));
    }
    return savedNikService.update(id, cleaned);
  };
}
