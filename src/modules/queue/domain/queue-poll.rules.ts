/** Satu baris tabel interval polling dari server (kontrak §3.4). `maxPosition` kosong berarti "sisanya". */
export type QueuePollTier = { maxPosition: number | null; pollAfterMs: number };

/**
 * Interval polling cadangan untuk satu posisi. Server tidak tahu posisi pemanggil (endpoint di-cache CDN), jadi
 * klien yang memilih baris pertama yang memuat posisinya (kontrak §3.4). `fallbackMs` dipakai bila tabel kosong
 * atau tidak ada baris yang cocok.
 */
export function pollAfterMs(position: number, tiers: readonly QueuePollTier[], fallbackMs: number): number {
  const tier = tiers.find((candidate) => candidate.maxPosition === null || candidate.maxPosition >= position);
  return tier?.pollAfterMs ?? fallbackMs;
}
