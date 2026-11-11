import { WAIT_HOURS_FROM_MINUTES, WAIT_MAX_MINUTES } from "./queue.constants";

/** Estimasi waktu tunggu untuk ditampilkan (kontrak §3.5, FR-09). `FULL_BOOKED` ditangani pemanggil. */
export type QueueWaitEstimate =
  /** Posisi 0 atau kurang: giliran sebentar lagi. */
  | { kind: "soon" }
  /** Laju belum ada (belum ada booking yang diproses), jadi belum ada yang bisa dihitung. */
  | { kind: "calculating" }
  | { kind: "minutes"; minutes: number }
  /** Kelipatan setengah jam, mis. 1,5. */
  | { kind: "hours"; hours: number }
  /** Di atas batas `hours` jam. */
  | { kind: "long"; hours: number };

/** Pembulatan selalu ke atas dan dalam langkah besar, supaya estimasi condong pesimis dan angkanya tidak berkedip. */
function roundUpMinutes(raw: number): number {
  if (raw <= 10) return raw;
  if (raw <= 30) return Math.ceil(raw / 5) * 5;
  if (raw <= 60) return Math.ceil(raw / 10) * 10;
  return Math.ceil(raw / 30) * 30;
}

/** `ratePerMin` adalah jumlah nomor yang dilewati `nowServing` per menit. */
export function queueWaitEstimate(position: number, ratePerMin: number): QueueWaitEstimate {
  if (position <= 0) return { kind: "soon" };
  if (ratePerMin <= 0) return { kind: "calculating" };
  const minutes = roundUpMinutes(Math.ceil(position / ratePerMin));
  if (minutes > WAIT_MAX_MINUTES) return { kind: "long", hours: WAIT_MAX_MINUTES / 60 };
  if (minutes >= WAIT_HOURS_FROM_MINUTES) return { kind: "hours", hours: minutes / 60 };
  return { kind: "minutes", minutes };
}
