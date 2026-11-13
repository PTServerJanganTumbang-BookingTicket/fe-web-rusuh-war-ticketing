/**
 * Jeda polling cadangan bila server tidak mengirim `poll_after_ms` maupun `poll_tiers` (ADR-0016). Nilainya sama
 * dengan contoh kontrak `GET /queue/serving`; interval sebenarnya ditentukan server (kontrak §3.4).
 */
export const QUEUE_POLL_FALLBACK_MS = 5_000;

/** Mulai menit ini estimasi tunggu ditulis dalam jam (kontrak §3.5, FR-09). */
export const WAIT_HOURS_FROM_MINUTES = 60;

/** Di atas menit ini estimasi tunggu hanya ditulis "lebih dari 3 jam" (kontrak §3.5, FR-09). */
export const WAIT_MAX_MINUTES = 180;

/** Permintaan produk: tiket habis/penjualan berakhir → modal lalu kembali ke beranda dalam 10 detik. */
export const QUEUE_GONE_REDIRECT_SECONDS = 10;

/**
 * Jeda `GET /queue/me` selama giliran sudah tiba (posisi ≤ 0) tetapi server masih menjawab `QUEUED` karena baris
 * grant belum terbaca: "klien mengulang setelah 1 detik" (kontrak §3.2 dan §3.3). Berlaku juga saat stream tersambung.
 */
export const QUEUE_TURN_ARRIVED_POLL_MS = 1_000;
