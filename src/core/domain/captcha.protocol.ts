/** Konfigurasi CAPTCHA dari `GET /events/{event_id}` (`captcha`). */
export type CaptchaConfig = { provider: string; siteKey: string };

/**
 * Mengambil token CAPTCHA tak terlihat untuk endpoint yang memintanya (join antrian).
 * Mode interaktif tidak dipakai: kontrak melarangnya karena nomor antrian dibagikan saat join.
 */
export interface CaptchaProtocol {
  /** Event tanpa konfigurasi CAPTCHA (`null`) menghasilkan token kosong. */
  solve(config: CaptchaConfig | null): Promise<string>;
}
