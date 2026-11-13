/** Cookie access token antrian. Dipakai route handler `/api/session/start` dan gerbang `proxy.ts`. */
export const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * Event pemilik grant di `ACCESS_TOKEN_COOKIE`. Gerbang `proxy.ts` hanya membuka `/events/{id}/book` bila nilainya
 * sama dengan `{id}`: grant event lain tidak membuat customer melewati antrian event ini (FR-06).
 */
export const ACCESS_EVENT_COOKIE = "access_event";

/**
 * Umur cookie grant = `GRANT_TOKEN_TTL_SECONDS` di kontrak (docs/api/api-contracts.md): booking 300 + payment 600 +
 * grace 180 detik. Lebih pendek dari ini membuat `proxy.ts` mengalihkan `/orders/:id/pay` ke `/` saat customer masih
 * membayar.
 */
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 1080;
