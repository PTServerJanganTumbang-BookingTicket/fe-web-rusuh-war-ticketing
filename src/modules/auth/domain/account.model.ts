/** Akun yang sedang masuk. Kontrak belum punya endpoint profil; datanya dari response verifikasi (ADR-0023). */
export type Account = { email: string; nikMasked: string };

/**
 * Profil akun dari `GET /accounts/me`. Endpoint ini masih asumsi (docs/api/contract-assumptions.md); bila belum
 * ada, halaman profil memakai `Account` dari sesi.
 */

/**
 * Alias: NIK orang lain (atau milik sendiri) dengan nama panggilan, sudah diverifikasi Dukcapil saat disimpan
 * (design.md, kontrak `/accounts/me/saved-niks`). Kontrak menyebutnya saved NIK.
 */
export type SavedNik = {
  id: string;
  nikMasked: string;
  label: string;
  verifiedAt: string;
};

/** Isian form alias setelah dirapikan. */
export type SavedNikInput = { label: string; nik: string };

export type SavedNikList = { maxEntries: number; savedNiks: SavedNik[] };

export type RegisterInput = {
  email: string;
  nik: string;
  /** Persetujuan wajib dicentang sendiri oleh customer (UU PDP); versi kebijakan dikirim bersama. */
  policyVersion: string;
};

/** Tujuan setelah login, sudah berupa path internal yang dibangun server, plus booking yang dipulihkan (BR-09). */
export type LoginResult = { redirectPath: string; booking: { eventId?: string; bookingId?: string } | null };

/** Ringkasan event untuk kartu konteks booking setelah login. */
export type EventSummary = { name: string; city: string; venue: string; date: string; imageUrl: string };
