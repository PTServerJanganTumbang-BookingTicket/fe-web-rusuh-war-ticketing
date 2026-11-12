/**
 * Konstanta untuk modul catalog.
 * Ref: Req 1.4 — data harus ter-refresh dalam waktu tidak lebih dari 5 detik.
 */

/** Interval polling untuk refresh daftar event (Req 1.4). */
export const CATALOG_REFRESH_INTERVAL_MS = 5_000;

/** Waktu sebelum sold out menjadi final (15.5 menit = 930 detik) (BR-20). */
export const SOLD_OUT_FINAL_TIMEOUT_SECONDS = 930;

/** Kategori bila BE tidak mengirim `category` (kontrak §2.1 selalu mengirim; ini hanya jaring pengaman). */
export const DEFAULT_CATEGORY = "EVENT";

/** Nilai tab "Semua" pada filter kategori Home. */
export const ALL_CATEGORIES = "all";

/** Jumlah maksimal event di Home; sisanya ada di halaman semua event. */
export const HOME_EVENT_LIMIT = 15;
