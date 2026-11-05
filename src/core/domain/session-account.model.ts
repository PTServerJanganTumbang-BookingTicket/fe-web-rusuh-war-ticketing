/**
 * Akun yang sedang masuk, dari cookie sesi (`GET /api/auth/session`, ADR-0023). Dipakai navbar di semua halaman,
 * jadi ada di `core`; modul `auth` memakai bentuk yang sama untuk halaman profil. `null` berarti tamu.
 */
export type SessionAccount = { email: string; nikMasked: string };
