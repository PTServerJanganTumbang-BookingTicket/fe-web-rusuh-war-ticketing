/** BR-01: maksimal tiket per NIK per event. Server tetap yang menegakkan (ADR-0011). */
export const MAX_TICKETS_PER_NIK = 3;

/** BR-01: maksimal tiket dalam satu booking (kontrak `POST /bookings`, `tickets.maxItems`). */
export const MAX_TICKETS_PER_BOOKING = 3;

/** Interval penyegaran stok Detail Ticket, sebelum jitter (ADR-0004). */
export const STOCK_REFRESH_INTERVAL_MS = 10_000;

/** Stok dianggap segar sebentar supaya kembali ke tab tidak memicu refetch beruntun. */
export const STOCK_STALE_TIME_MS = 5_000;

/**
 * Permintaan produk: setelah waktu booking habis, modal tampil lalu layar kembali ke Beranda dalam 5 detik.
 * Ini jeda tampilan, bukan TTL; kedaluwarsa tetap diputuskan server (ADR-0005).
 */
export const BOOKING_TIMEOUT_REDIRECT_SECONDS = 5;
