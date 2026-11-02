/**
 * Konstanta untuk modul catalog.
 * Ref: Req 1.4 — data harus ter-refresh dalam waktu tidak lebih dari 5 detik.
 */

/** Interval polling untuk refresh daftar event (Req 1.4). */
export const CATALOG_REFRESH_INTERVAL_MS = 5_000;

/** Waktu sebelum sold out menjadi final (15.5 menit = 930 detik) (BR-20). */
export const SOLD_OUT_FINAL_TIMEOUT_SECONDS = 930;
