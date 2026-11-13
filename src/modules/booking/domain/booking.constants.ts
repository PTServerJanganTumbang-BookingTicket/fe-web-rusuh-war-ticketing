/** BR-01: maksimal tiket per NIK per event. Server tetap yang menegakkan (ADR-0011). */
export const MAX_TICKETS_PER_NIK = 3;

/** BR-01: maksimal tiket dalam satu booking (kontrak `POST /bookings`, `tickets.maxItems`). */
export const MAX_TICKETS_PER_BOOKING = 3;

/** Interval penyegaran stok Detail Ticket, sebelum jitter (ADR-0004). */
export const STOCK_REFRESH_INTERVAL_MS = 10_000;

/**
 * Permintaan produk: setelah waktu booking habis, modal tampil lalu layar kembali ke Beranda dalam 5 detik.
 * Ini jeda tampilan, bukan TTL; kedaluwarsa tetap diputuskan server (ADR-0005).
 */
export const BOOKING_TIMEOUT_REDIRECT_SECONDS = 5;

/**
 * Permintaan produk: setelah tombol "Verifikasi Dukcapil" ditekan, tombol itu mati 3 detik (per tiket) supaya tidak
 * bisa ditekan berulang-ulang. Ini jeda tampilan, bukan TTL atau batas laju server (`429` tetap milik server).
 */
export const NIK_VERIFY_COOLDOWN_MS = 3_000;
