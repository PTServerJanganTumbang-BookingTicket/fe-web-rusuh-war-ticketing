import { isAuthRequired, type AppError } from "@rusuh/core";

/** Alasan customer dibawa ke halaman login; menentukan pesan di sana. */
export type LoginReason = "required" | "revoked";

export function parseLoginReason(raw: string | null | undefined): LoginReason | undefined {
  return raw === "required" || raw === "revoked" ? raw : undefined;
}

const AUTH_PAGES = /^\/(login|auth|register)(?=$|\/)/;

/**
 * Server menolak karena belum login atau sesi dicabut (ADR-0010): kembali ke login lalu ke halaman yang sama.
 * Progres (antrian, booking, order) tetap di server, jadi FE tidak membatalkan apa pun (prinsip "jangan PHP").
 * `undefined` bila error lain atau customer sudah di halaman auth (mencegah loop).
 */
export function loginRedirectPath(error: AppError, location: { pathname: string; search: string }): string | undefined {
  if (!isAuthRequired(error) || AUTH_PAGES.test(location.pathname)) return undefined;
  const reason: LoginReason = error.kind === "api" && error.code === "SESSION_REVOKED" ? "revoked" : "required";
  return `/login?${new URLSearchParams({ reason, returnTo: `${location.pathname}${location.search}` })}`;
}
