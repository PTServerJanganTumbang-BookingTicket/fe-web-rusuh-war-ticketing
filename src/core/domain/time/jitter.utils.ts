/** Interval dasar ± ratio (default 20%) agar klien tidak polling serentak (ADR-0004). `random` ∈ [0, 1). */
export function withJitter(baseMs: number, random: number, ratio = 0.2): number {
  const spread = baseMs * ratio;
  return Math.round(baseMs - spread + random * 2 * spread);
}
