import { z } from "zod";
import type { Account, LoginResult, SavedNikList } from "../domain/account.model";

const accountSchema = z
  .object({ email: z.string(), nik_masked: z.string() })
  .transform((account): Account => ({ email: account.email, nikMasked: account.nik_masked }));

/** `data` dari route same-origin `POST /api/auth/verify`. Token akun tidak pernah ada di sini. */
export const loginResultSchema = z
  .object({ redirect_path: z.string() })
  .transform((result): LoginResult => ({ redirectPath: result.redirect_path }));

/** `data` dari `GET /api/auth/session`. */
export const sessionSchema = z
  .object({ account: accountSchema.nullable() })
  .transform((session): Account | null => session.account);

/** `data` dari `GET /accounts/me/saved-niks` (diteruskan lewat `/api/account/saved-niks`). */
export const savedNikListSchema = z
  .object({
    max_entries: z.number(),
    saved_niks: z.array(
      z.object({ id: z.string(), nik_masked: z.string(), label: z.string(), verified_at: z.string() }),
    ),
  })
  .transform((list): SavedNikList => ({
    maxEntries: list.max_entries,
    savedNiks: list.saved_niks.map((saved) => ({
      id: saved.id,
      nikMasked: saved.nik_masked,
      label: saved.label,
      verifiedAt: saved.verified_at,
    })),
  }));
