/** NIK selalu 16 digit angka (BR-02). */
export const NIK_LENGTH = 16;

/**
 * Merapikan isian NIK saat diketik atau ditempel: hanya digit, dan digit ke-17 dst ditolak. Spasi atau tanda baca dari
 * salinan KTP dibuang lebih dulu, jadi "3171 0000 0000 0044" tetap utuh.
 */
export function sanitizeNikInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, NIK_LENGTH);
}
