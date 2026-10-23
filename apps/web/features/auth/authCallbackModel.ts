import type { AppError } from "@rusuh/core";

// Kondisi layar penukaran link login (ADR-0017, Figma SJT ZAKI "Authenticated · return to the requested page").

export type AuthCallbackScreenState = { kind: "redeeming" } | { kind: "failed"; error: AppError };

export function deriveAuthCallbackScreenState(error: AppError | undefined): AuthCallbackScreenState {
  // Setelah berhasil, layar tetap "redeeming" sampai navigasi ke halaman tujuan selesai.
  return error ? { kind: "failed", error } : { kind: "redeeming" };
}
