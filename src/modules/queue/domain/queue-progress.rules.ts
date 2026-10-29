/** Persentase kemajuan antrian 0–100 dari posisi saat masuk dan posisi sekarang. */
export function queueProgressPercent(joinedPosition: number, position: number): number {
  if (joinedPosition <= 0) return 100;
  const moved = (joinedPosition - position) / joinedPosition;
  return Math.min(100, Math.max(0, Math.floor(moved * 100)));
}
