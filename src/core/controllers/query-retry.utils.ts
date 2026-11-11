import { AppFailure } from "@/core/domain/app-error";

/** Batas percobaan ulang query setelah gagal; setelah itu query berstatus error dan polling berhenti. */
export const QUERY_MAX_RETRIES = 1;

/**
 * Ulangi hanya galat sementara (jaringan, 5xx, tak dikenal). Galat kontrak (4xx dengan kode) dan respons
 * yang tidak sesuai skema tidak akan berubah bila diulang.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= QUERY_MAX_RETRIES) return false;
  if (error instanceof AppFailure) return error.error.kind === "network" || error.error.kind === "unknown";
  return true;
}

/** Polling dihentikan begitu query berstatus error (retry habis); refetch manual atau muat ulang melanjutkan. */
export function pollingStopped(query: { state: { status: string } }): boolean {
  return query.state.status === "error";
}
