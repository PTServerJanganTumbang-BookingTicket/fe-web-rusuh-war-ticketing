/** Cookie access token antrian. Dipakai route handler `/api/session/start` dan gerbang `proxy.ts`. */
export const ACCESS_TOKEN_COOKIE = "access_token";

/**
 * Event pemilik grant di `ACCESS_TOKEN_COOKIE`. Gerbang `proxy.ts` hanya membuka `/events/{id}/book` bila nilainya
 * sama dengan `{id}`: grant event lain tidak membuat customer melewati antrian event ini (FR-06).
 */
export const ACCESS_EVENT_COOKIE = "access_event";

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 10 * 60;
