import { SAVED_NIK_LABEL_MAX_LENGTH } from "./auth.constants";
import type { SavedNikInput } from "./account.model";

/** Validasi bentuk di klien supaya galat muncul sebelum request; server tetap memvalidasi ulang. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** NIK selalu 16 digit angka (BR-02). Keaslian dicek Dukcapil di server. */
export function isNikFormat(value: string): boolean {
  return /^\d{16}$/.test(value);
}

export type SavedNikInputError = { label?: "required" | "too_long"; nik?: "format" };

/**
 * Validasi bentuk alias sebelum dikirim. Saat membuat, NIK wajib; saat mengubah, NIK kosong berarti tetap.
 * Mengembalikan `null` bila isian siap dikirim.
 */
export function validateSavedNikInput(
  input: SavedNikInput,
  { mode }: { mode: "create" | "edit" },
): SavedNikInputError | null {
  const errors: SavedNikInputError = {};
  const label = input.label.trim();
  if (label === "") errors.label = "required";
  else if (label.length > SAVED_NIK_LABEL_MAX_LENGTH) errors.label = "too_long";
  const keepNik = mode === "edit" && input.nik === "";
  if (!keepNik && !isNikFormat(input.nik)) errors.nik = "format";
  return errors.label || errors.nik ? errors : null;
}
