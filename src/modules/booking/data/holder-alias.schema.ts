import { z } from "zod";
import type { HolderAlias } from "../domain/holder-alias.model";

/**
 * `data` dari `GET /accounts/me/saved-niks` (kontrak §1.6). NIK lengkap tidak pernah dikirim; entri dipilih lewat
 * `id` dan ditampilkan dengan `nik_masked` apa adanya (klien tidak mengurai isinya).
 */
export const holderAliasListSchema = z
  .object({
    saved_niks: z.array(z.object({ id: z.string(), label: z.string(), nik_masked: z.string() })),
  })
  .transform((list): HolderAlias[] =>
    list.saved_niks.map((saved) => ({ id: saved.id, label: saved.label, nikMasked: saved.nik_masked })),
  );
