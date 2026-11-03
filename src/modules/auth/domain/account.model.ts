/** Akun yang sedang masuk. Kontrak belum punya endpoint profil; datanya dari response verifikasi (ADR-0023). */
export type Account = { email: string; nikMasked: string };

/** NIK teman yang sudah diverifikasi Dukcapil saat disimpan (design.md, kontrak `/accounts/me/saved-niks`). */
export type SavedNik = { id: string; nikMasked: string; label: string; verifiedAt: string };

export type SavedNikList = { maxEntries: number; savedNiks: SavedNik[] };

export type RegisterInput = {
  email: string;
  nik: string;
  name: string;
  /** Persetujuan wajib dicentang sendiri oleh customer (UU PDP); versi kebijakan dikirim bersama. */
  policyVersion: string;
};

/** Tujuan setelah login, sudah berupa path internal yang dibangun server (BR-09). */
export type LoginResult = { redirectPath: string };
