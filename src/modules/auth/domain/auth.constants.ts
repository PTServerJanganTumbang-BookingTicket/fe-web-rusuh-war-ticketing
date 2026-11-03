/** Jeda kirim ulang link login, sama dengan `retry_after` contoh 429 di kontrak `POST /auth/magic-link`. */
export const RESEND_COOLDOWN_MS = 60_000;

/** Versi kebijakan privasi yang disetujui saat register (contoh kontrak `POST /auth/register`). */
export const PRIVACY_POLICY_VERSION = "2026-10-01";
