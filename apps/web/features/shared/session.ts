/** Nama cookie sesi booking (httpOnly). Ditulis oleh /api/session/start dan diperiksa oleh proxy.ts. */
export const ACCESS_TOKEN_COOKIE = "access_token";

/** Umur cookie sesi booking. */
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 10 * 60;

/** Mengambil `accessToken` dari body /api/session/start. `null` bila bentuknya salah atau kosong. */
export function parseStartSessionBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("accessToken" in body)) return null;
  return typeof body.accessToken === "string" && body.accessToken !== "" ? body.accessToken : null;
}
