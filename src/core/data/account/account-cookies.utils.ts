/**
 * Cookie token akun (ADR-0023). Semuanya httpOnly dan hanya dibaca route same-origin `/api/auth/*` dan
 * `/api/account/*`; JavaScript browser tidak pernah melihat isinya. Nama dibedakan dari `queue_token` milik BE
 * dan cookie grant `access_token` untuk gerbang halaman.
 */
export const ACCOUNT_TOKEN_COOKIE = "account_token";
export const ACCOUNT_REFRESH_COOKIE = "account_refresh";
/** Email dan NIK tersamar untuk layar akun. Kontrak belum punya `GET /accounts/me` (ADR-0023 usulan 4). */
export const ACCOUNT_PROFILE_COOKIE = "account_profile";

/** Refresh token berlaku 30 hari (kontrak, `POST /auth/refresh`). */
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type CookieOptions = { maxAge: number; secure: boolean };

export function serializeCookie(name: string, value: string, { maxAge, secure }: CookieOptions): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookie(name: string, secure: boolean): string {
  return serializeCookie(name, "", { maxAge: 0, secure });
}

export function readCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}
