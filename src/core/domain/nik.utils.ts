/** NIK selalu 16 digit angka (BR-02). */
export const NIK_LENGTH = 16;

/**
 * Merapikan isian NIK saat diketik atau ditempel: hanya digit, dan digit ke-17 dst ditolak. Spasi atau tanda baca dari
 * salinan KTP dibuang lebih dulu, jadi "3171 0000 0000 0044" tetap utuh.
 */
/** NIK 16 digit utuh; bentuk tersamar dari server (mis. `3171********22`) tidak lolos. */
export function isFullNik(value: string): boolean {
  return /^\d{16}$/.test(value);
}

/** Bentuk tersamar untuk tampilan: 4 digit awal dan 2 digit akhir, sama dengan `nik_masked` di kontrak. */
export function maskNik(nik: string): string {
  return `${nik.slice(0, 4)}${"*".repeat(Math.max(nik.length - 6, 0))}${nik.slice(-2)}`;
}

export function sanitizeNikInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, NIK_LENGTH);
}
