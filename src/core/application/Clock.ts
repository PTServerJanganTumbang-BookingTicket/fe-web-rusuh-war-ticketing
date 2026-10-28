/** Jam sistem sebagai port, supaya perhitungan waktu bisa dites tanpa memalsukan global (ADR-0005). */
export interface Clock {
  now(): number;
}
