/**
 * @file payment.constants.ts
 * @description Payment Module Constants - API Contracts v2.1
 *
 * Requirements: 6.1, 6.7, 6.13, 6.19, BR-05, BR-06
 * Konstanta bisnis untuk modul pembayaran.
 */

/* ========================================================================== */
/*                              TTL Constants                                 */
/* ========================================================================== */

/**
 * BR-05: TTL pembayaran dalam detik.
 * Dimulai dari POST /bookings, bukan dari halaman dibuka.
 */
export const TTL_PAYMENT_SECONDS = 600; // 10 menit

/**
 * BR-10: Grace period dalam detik.
 * Waktu tambahan setelah TTL habis sebelum order benar-benar expired.
 */
export const GRACE_PERIOD_SECONDS = 30;

/* ========================================================================== */
/*                            Polling Constants                               */
/* ========================================================================== */

/**
 * Req 6.13: Interval polling untuk status pembayaran.
 * Tidak menggunakan SSE untuk payment — audience adalah 1 orang.
 */
export const PAYMENT_STATUS_POLL_INTERVAL_MS = 3_000; // 3 detik

/* ========================================================================== */
/*                             Retry Constants                                */
/* ========================================================================== */

/**
 * Req 6.19: Minimum sisa TTL untuk membolehkan ganti metode.
 * Guard untuk PAYMENT_WINDOW_CLOSED error.
 */
export const MIN_RETRY_REMAINING_SECONDS = 60; // 1 menit

/**
 * BR-06: Maksimum percobaan pembayaran per booking.
 */
export const MAX_PAYMENT_ATTEMPTS = 3;
