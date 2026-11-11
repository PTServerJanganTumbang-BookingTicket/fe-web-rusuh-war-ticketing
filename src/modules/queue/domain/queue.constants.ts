/** Jeda polling cadangan saat SSE putus. Sama dengan `poll_after_ms` contoh kontrak `GET /queue/serving` (ADR-0016). */
export const QUEUE_POLL_FALLBACK_MS = 5_000;

/** Mulai menit ini estimasi tunggu ditulis dalam jam (kontrak §3.5, FR-09). */
export const WAIT_HOURS_FROM_MINUTES = 60;

/** Di atas menit ini estimasi tunggu hanya ditulis "lebih dari 3 jam" (kontrak §3.5, FR-09). */
export const WAIT_MAX_MINUTES = 180;
