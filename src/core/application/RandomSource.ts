/** Sumber acak sebagai port. `next()` ∈ [0, 1). Dipakai untuk jitter polling (ADR-0004). */
export interface RandomSource {
  next(): number;
}
