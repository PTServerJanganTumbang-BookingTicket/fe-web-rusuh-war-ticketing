import { SAVED_NIK_LABEL_MAX_LENGTH } from "./auth.constants";
import type { SavedNikInput } from "./account.model";

/** Validasi bentuk di klien supaya galat muncul sebelum request; server tetap memvalidasi ulang. */
export function isEmail(value: string): boolean {
  // Tanpa regex berantai: pola `[^\s@]+@[^\s@]+\.[^\s@]+` berpotensi backtracking super-linear.
  const email = value.trim();
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@") || /\s/.test(email)) return false;
  const domain = email.slice(at + 1);
  const dot = domain.indexOf(".", 1);
  return dot !== -1 && dot < domain.length - 1;
}

/** NIK selalu 16 digit angka (BR-02). Keaslian dicek Dukcapil di server. */
export function isNikFormat(value: string): boolean {
  return /^\d{16}$/.test(value);
}

export type SavedNikInputError = {
  label?: "too_long";
  nik?: "format";
};

/**
 * Alias bersifat opsional di UI, tetapi kontrak (Apidog) mewajibkan `label`. Alias kosong diisi
 * dari 4 digit terakhir NIK supaya tetap bisa dibedakan di daftar tanpa membuka NIK lengkap.
 */
export function savedNikLabelOf(label: string, nik: string): string {
  const trimmed = label.trim();
  return trimmed === "" ? `NIK ••${nik.slice(-4)}` : trimmed;
}

/**
 * Validasi bentuk alias sebelum dikirim. NIK wajib 16 digit; alias boleh kosong tetapi dibatasi panjangnya.
 * Mengembalikan `null` bila isian siap dikirim.
 */
export function validateSavedNikInput(input: SavedNikInput): SavedNikInputError | null {
  const errors: SavedNikInputError = {};
  if (input.label.trim().length > SAVED_NIK_LABEL_MAX_LENGTH) errors.label = "too_long";
  if (!isNikFormat(input.nik)) errors.nik = "format";
  return errors.label || errors.nik ? errors : null;
}
