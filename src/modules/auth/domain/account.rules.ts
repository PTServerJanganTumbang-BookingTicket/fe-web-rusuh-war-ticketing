import { EMAIL_MAX_LENGTH } from "@/core/domain/email.constants";
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

export type EmailInputError = "required" | "too_long" | "invalid";

/**
 * Galat isian email di form masuk dan daftar, atau `null` bila siap dikirim. Panjang dicek di sini juga karena
 * `maxLength` di input tidak berlaku untuk nilai yang ditempel di sebagian peramban atau diisi otomatis.
 */
export function emailInputError(value: string): EmailInputError | null {
  const email = value.trim();
  if (email === "") return "required";
  if (email.length > EMAIL_MAX_LENGTH) return "too_long";
  return isEmail(email) ? null : "invalid";
}

/** NIK selalu 16 digit angka (BR-02). Keaslian dicek Dukcapil di server. */
export function isNikFormat(value: string): boolean {
  return /^\d{16}$/.test(value);
}

/**
 * Karakter yang boleh ada di nama alias, sebagai isi kelas karakter regex. Permintaan produk: huruf dan angka saja.
 * Spasi antar kata diizinkan supaya nama seperti "Budi Santoso" bisa diketik (asumsi, perlu konfirmasi produk);
 * bila produk menolak spasi, cukup hapus spasi di akhir nilai ini. Dipakai isian dan validasi submit sekaligus.
 */
const LABEL_ALLOWED_CHARS = "A-Za-z0-9 ";
const LABEL_PATTERN = new RegExp(`^[${LABEL_ALLOWED_CHARS}]*$`);
const LABEL_DISALLOWED_PATTERN = new RegExp(`[^${LABEL_ALLOWED_CHARS}]`, "g");

/**
 * Membersihkan nama alias saat diketik atau ditempel: karakter di luar daftar dibuang, spasi di awal dan spasi
 * beruntun dirapikan, lalu dipotong di batas panjang. Spasi di akhir dibiarkan supaya kata berikutnya bisa diketik;
 * `savedNikLabelOf` memangkasnya saat disimpan.
 */
export function sanitizeSavedNikLabelInput(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(LABEL_DISALLOWED_PATTERN, "")
    .replace(/ {2,}/g, " ")
    .replace(/^ /, "")
    .slice(0, SAVED_NIK_LABEL_MAX_LENGTH);
}

export type SavedNikInputError = {
  label?: "too_long" | "invalid_chars";
  nik?: "format";
};

/**
 * Alias bersifat opsional di UI, tetapi kontrak (Apidog) mewajibkan `label`. Alias kosong diisi
 * dari 4 digit terakhir NIK supaya tetap bisa dibedakan di daftar tanpa membuka NIK lengkap.
 */
export function savedNikLabelOf(label: string, nik: string): string {
  const trimmed = label.trim();
  return trimmed === "" ? `NIK ${nik.slice(-4)}` : trimmed;
}

/**
 * Validasi bentuk alias sebelum dikirim. NIK wajib 16 digit; alias boleh kosong tetapi dibatasi panjangnya.
 * Mengembalikan `null` bila isian siap dikirim.
 */
export function validateSavedNikInput(input: SavedNikInput): SavedNikInputError | null {
  const errors: SavedNikInputError = {};
  const label = input.label.trim();
  if (!LABEL_PATTERN.test(label)) errors.label = "invalid_chars";
  else if (label.length > SAVED_NIK_LABEL_MAX_LENGTH) errors.label = "too_long";
  if (!isNikFormat(input.nik)) errors.nik = "format";
  return errors.label || errors.nik ? errors : null;
}

const SAFE_REDIRECT_PATTERN = /^\/(?:orders\/[\w-]+\/pay|events\/[\w-]+\/queue)$/;

/**
 * Tujuan setelah masuk dari parameter `next` di URL. Nilainya datang dari URL, jadi tidak pernah diikuti begitu saja
 * (ADR-0023 butir 5): hanya halaman bayar dan antrean booking yang dikenal yang lolos, selain itu ke beranda.
 */
export function safeRedirectPath(next: string | null): string {
  return next !== null && SAFE_REDIRECT_PATTERN.test(next) ? next : "/";
}
