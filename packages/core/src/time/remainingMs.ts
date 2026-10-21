/** Selisih jam server terhadap jam klien. Positif berarti server lebih cepat. */
export function serverOffsetMs(serverNowMs: number, clientNowMs: number): number {
  return serverNowMs - clientNowMs;
}

/**
 * Sisa waktu dari `expiresAt` (jam server), bukan dari durasi (ADR-0005).
 * Bertahan saat tab tertidur karena selalu dihitung ulang dari `now`.
 */
export function remainingMs(expiresAt: string, clientNowMs: number, offsetMs: number): number {
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) return 0;
  return Math.max(0, expiresAtMs - (clientNowMs + offsetMs));
}
