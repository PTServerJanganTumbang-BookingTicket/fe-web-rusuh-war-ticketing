/** Konfigurasi CAPTCHA dari `GET /events/{event_id}` (`captcha`). */
export type CaptchaConfig = { provider: string; siteKey: string };

/**
 * Tahap pemeriksaan keamanan yang sedang ditunggu join antrian. `checking`: CAPTCHA tak terlihat sedang berjalan.
 * `interactive`: penyedia meminta customer menyelesaikan tantangan (widget tampil di layar). Hanya `solve` yang
 * dihitung; `presolve` di latar tidak pernah membuat layar menunggu.
 */
export type CaptchaStatus = "idle" | "checking" | "interactive";

/**
 * Mengambil token CAPTCHA untuk endpoint yang memintanya (join antrian). Mode tak terlihat dipakai: nomor antrian
 * dibagikan saat join. Tantangan interaktif hanya muncul bila penyedia memintanya, dan hanya saat `solve`.
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
   * masih segar diabaikan. Tantangan interaktif tidak ditampilkan di latar: penyelesaian dibatalkan dan `solve`
   * mengulangnya saat customer sudah di ruang tunggu.
   */
  presolve(scope: string, config: CaptchaConfig | null): void;
  /** Tahap `solve` yang sedang berjalan, untuk layar yang menunggu token. */
  status(): CaptchaStatus;
  /** Berlangganan perubahan `status()`. Mengembalikan pelepas langganan. */
  subscribe(listener: () => void): () => void;
}
