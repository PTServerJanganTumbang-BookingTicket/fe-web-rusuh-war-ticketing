/**
 * @file clock-sync.rules.ts
 * @description Clock synchronization rules untuk payment countdown.
 *
 * Requirements: 14.8-14.11, BR-24
 * Fungsi murni untuk menghitung clock offset dan remaining time.
 *
 * ADR-0005: Timer/countdown berbasis server-authoritative expiresAt + offset.
 */

/* ========================================================================== */
/*                            Clock Offset Rules                              */
/* ========================================================================== */

/**
 * Menghitung clock offset antara server dan client.
 * Positif berarti jam server lebih cepat dari jam client.
 *
 * Requirement 14.8:
 * clockOffset = Date.parse(server_time) - Date.now()
 *
 * @param serverTimeMs - Waktu server dalam milliseconds (dari Date.parse(server_time))
 * @param clientTimeMs - Waktu client dalam milliseconds (dari clock.now())
 * @returns Offset dalam milliseconds
 */
export function calculateClockOffset(serverTimeMs: number, clientTimeMs: number): number {
  return serverTimeMs - clientTimeMs;
}

/**
 * Menghitung waktu terkini dengan memperhitungkan clock offset.
 *
 * Requirement 14.8:
 * Seluruh perhitungan waktu HARUS menggunakan Date.now() + clockOffset sebagai waktu terkini.
 *
 * @param clientNowMs - Waktu client saat ini dalam milliseconds
 * @param offsetMs - Clock offset dalam milliseconds
 * @returns Waktu terkini yang tersinkronisasi dengan server
 */
export function getSynchronizedNow(clientNowMs: number, offsetMs: number): number {
  return clientNowMs + offsetMs;
}

/* ========================================================================== */
/*                          Remaining Time Rules                              */
/* ========================================================================== */

/**
 * Menghitung sisa waktu dari deadline (expiresAt) dengan clock offset.
 *
 * Requirement 14.9:
 * remaining = deadline - (Date.now() + clockOffset)
 * Dihitung ulang setiap detik, TIDAK dikurangi dari variabel.
 *
 * @param expiresAt - Deadline dalam ISO string atau milliseconds
 * @param clientNowMs - Waktu client saat ini dalam milliseconds
 * @param offsetMs - Clock offset dalam milliseconds
 * @returns Sisa waktu dalam milliseconds (minimum 0)
 */
export function calculateRemaining(
  expiresAt: string | number,
  clientNowMs: number,
  offsetMs: number,
): number {
  const expiresAtMs = typeof expiresAt === "string" ? Date.parse(expiresAt) : expiresAt;

  // Jika parsing gagal, return 0
  if (Number.isNaN(expiresAtMs)) {
    return 0;
  }

  const synchronizedNow = getSynchronizedNow(clientNowMs, offsetMs);
  const remaining = expiresAtMs - synchronizedNow;

  // Tidak boleh negatif
  return Math.max(0, remaining);
}

/**
 * Mengecek apakah countdown sudah mencapai nol.
 *
 * Requirement 14.10:
 * WHEN countdown mencapai 0:00, THE Frontend SHALL membekukan tampilan
 * dan menampilkan overlay "Memverifikasi..."
 *
 * @param remainingMs - Sisa waktu dalam milliseconds
 * @returns true jika countdown sudah 0
 */
export function isCountdownZero(remainingMs: number): boolean {
  return remainingMs <= 0;
}

/* ========================================================================== */
/*                            TTL Validation Rules                            */
/* ========================================================================== */

/**
 * Mengecek apakah masih ada waktu tersisa untuk operasi tertentu.
 *
 * Requirement 14.11:
 * TTL TIDAK di-reset saat ganti metode pembayaran.
 * TTL tetap dihitung dari held_at booking awal (BR-05).
 *
 * @param remainingMs - Sisa waktu dalam milliseconds
 * @param minimumRequiredMs - Minimum waktu yang dibutuhkan dalam milliseconds
 * @returns true jika waktu mencukupi
 */
export function hasEnoughTimeForOperation(remainingMs: number, minimumRequiredMs: number): boolean {
  return remainingMs > minimumRequiredMs;
}

/**
 * Menghitung apakah masih bisa retry berdasarkan sisa waktu.
 *
 * BR-24: Retry payment hanya boleh jika TTL > MIN_RETRY_REMAINING_SECONDS.
 *
 * @param remainingMs - Sisa waktu dalam milliseconds
 * @param minRetryRemainingMs - Minimum sisa waktu untuk retry dalam milliseconds
 * @returns true jika masih bisa retry
 */
export function canRetryWithRemainingTime(remainingMs: number, minRetryRemainingMs: number): boolean {
  return remainingMs > minRetryRemainingMs;
}

/* ========================================================================== */
/*                         Countdown Display Rules                            */
/* ========================================================================== */

/**
 * Menentukan apakah countdown dalam kondisi urgent (hampir habis).
 *
 * Digunakan untuk menampilkan warning visual dan accessibility announcement.
 *
 * @param remainingMs - Sisa waktu dalam milliseconds
 * @param urgentThresholdMs - Threshold untuk kondisi urgent dalam milliseconds
 * @returns true jika dalam kondisi urgent
 */
export function isCountdownUrgent(remainingMs: number, urgentThresholdMs: number): boolean {
  return remainingMs > 0 && remainingMs <= urgentThresholdMs;
}

/**
 * Menentukan milestone countdown untuk accessibility announcement.
 *
 * Requirement 14.26:
 * Mengumumkan perubahan signifikan: tersisa 1 menit, tersisa 30 detik, waktu habis.
 *
 * @param previousMs - Sisa waktu sebelumnya dalam milliseconds
 * @param currentMs - Sisa waktu saat ini dalam milliseconds
 * @returns Milestone yang dicapai (atau null jika tidak ada)
 */
export function getCountdownMilestone(
  previousMs: number,
  currentMs: number,
): "ONE_MINUTE" | "THIRTY_SECONDS" | "ZERO" | null {
  const ONE_MINUTE_MS = 60_000;
  const THIRTY_SECONDS_MS = 30_000;

  // Cek apakah baru saja melewati milestone
  if (previousMs > ONE_MINUTE_MS && currentMs <= ONE_MINUTE_MS && currentMs > 0) {
    return "ONE_MINUTE";
  }

  if (previousMs > THIRTY_SECONDS_MS && currentMs <= THIRTY_SECONDS_MS && currentMs > 0) {
    return "THIRTY_SECONDS";
  }

  if (previousMs > 0 && currentMs <= 0) {
    return "ZERO";
  }

  return null;
}
