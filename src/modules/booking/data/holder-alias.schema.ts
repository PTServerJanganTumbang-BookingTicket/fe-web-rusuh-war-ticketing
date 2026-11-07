import { z } from "zod";
import type { HolderAlias } from "../domain/holder-alias.model";

/**
 * `data` dari `GET /accounts/me/saved-niks`. Field `nik` lengkap masih asumsi; selama BE hanya mengirim
 * `nik_masked`, daftar ini kosong dan Detail Ticket kembali ke isian NIK manual.
 */
export const holderAliasListSchema = z
  .object({
    saved_niks: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        name: z.string().nullish(),
        nik_masked: z.string(),
        nik: z.string().optional(),
      }),
    ),
  })
  .transform((list): HolderAlias[] =>
    list.saved_niks.flatMap((saved) =>
      saved.nik
        ? [
            {
              id: saved.id,
              label: saved.label,
              name: saved.name?.trim() || null,
              nik: saved.nik,
              nikMasked: saved.nik_masked,
            },
          ]
        : [],
    ),
  );
