/** Konfigurasi CAPTCHA dari `GET /events/{event_id}` (`captcha`). */
export type CaptchaConfig = { provider: string; siteKey: string };

/**
 * Mengambil token CAPTCHA tak terlihat untuk endpoint yang memintanya (join antrian).
 * Mode interaktif tidak dipakai: kontrak melarangnya karena nomor antrian dibagikan saat join.
 */
export interface CaptchaProtocol {
  /**
   * Event tanpa konfigurasi CAPTCHA (`null`) menghasilkan token kosong. Dengan `scope` yang sudah di-`presolve`,
   * token siap pakai itu dipakai sekali; bila tidak ada atau gagal, CAPTCHA diselesaikan saat itu juga.
   */
  solve(config: CaptchaConfig | null, scope?: string): Promise<string>;
  /** Memuat skrip penyedia lebih awal supaya `solve` berikutnya tidak menunggu unduhan. Aman dipanggil berulang. */
  warm(): void;
  /**
   * Menyelesaikan CAPTCHA di latar untuk `scope` (id event) sebelum dibutuhkan. Token bersifat sekali pakai dan
   * kedaluwarsa, jadi hasilnya dibuang bila tidak dipakai dalam beberapa menit. Panggilan ulang untuk scope yang
   * masih segar diabaikan.
   */
  presolve(scope: string, config: CaptchaConfig | null): void;
}
