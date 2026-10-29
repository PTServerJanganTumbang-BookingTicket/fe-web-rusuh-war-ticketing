/** Sumber acak sebagai protocol. `next()` ∈ [0, 1). Dipakai untuk jitter polling (ADR-0004). */
export interface RandomProtocol {
  next(): number;
}
