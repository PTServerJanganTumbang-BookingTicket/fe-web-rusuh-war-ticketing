export type QueueState =
  | {
      status: "waiting";
      eventName: string;
      position: number;
      /** Posisi saat customer masuk antrian, untuk progress bar. */
      joinedPosition: number;
      etaSeconds: number;
      retryAfterMs: number;
    }
  /** `accessToken` adalah grant slot (`X-Grant-Token`) dari `GET /queue/me`, bukan token akun. */
  | { status: "admitted"; eventName: string; accessToken: string; expiresAt: string }
  /** Antrian tidak bisa dilanjutkan: grant kedaluwarsa, booking sudah dibayar, atau penjualan ditutup. */
  | { status: "ended"; eventName: string; reason: "expired" | "confirmed" | "closed" };
