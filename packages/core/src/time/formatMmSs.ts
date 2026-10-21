/** 288_000 → "04:48". Pembulatan ke atas agar tampilan tidak menunjukkan 00:00 sebelum waktunya benar-benar habis. */
export function formatMmSs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
