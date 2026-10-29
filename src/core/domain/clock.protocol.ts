/** Jam sistem sebagai protocol, supaya perhitungan waktu bisa dites tanpa memalsukan global (ADR-0005). */
export interface ClockProtocol {
  now(): number;
}
