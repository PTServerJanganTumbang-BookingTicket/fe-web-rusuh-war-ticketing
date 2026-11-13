/** Jeda kirim ulang link login, sama dengan `retry_after` contoh 429 di kontrak `POST /auth/magic-link`. */
export const RESEND_COOLDOWN_MS = 60_000;

/** Panjang maksimal nama alias (permintaan produk: 50 karakter). */
export const SAVED_NIK_LABEL_MAX_LENGTH = 50;

/** Jeda layar sukses berhasil masuk sebelum pindah otomatis. Permintaan desain: 5 detik. */
export const AUTO_REDIRECT_SECONDS = 5;

/** Permintaan produk: layar sukses verifikasi email menunggu 10 detik sebelum ke halaman masuk. */
export const EMAIL_VERIFIED_REDIRECT_SECONDS = 10;
