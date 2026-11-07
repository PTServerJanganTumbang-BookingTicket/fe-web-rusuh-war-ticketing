/** Jeda kirim ulang link login, sama dengan `retry_after` contoh 429 di kontrak `POST /auth/magic-link`. */
export const RESEND_COOLDOWN_MS = 60_000;

/** Versi kebijakan privasi yang disetujui saat register (contoh kontrak `POST /auth/register`). */
export const PRIVACY_POLICY_VERSION = "2026-10-01";

/** Panjang maksimal nama panggilan alias; cukup untuk nama lengkap di KTP. Asumsi FE sampai kontrak membatasi. */
export const SAVED_NIK_LABEL_MAX_LENGTH = 40;

/** Panjang maksimal nama lengkap pemilik NIK di alias, sama dengan batas nama di e-KTP. Asumsi FE. */
export const SAVED_NIK_NAME_MAX_LENGTH = 100;
