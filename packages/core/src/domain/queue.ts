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
  | { status: "admitted"; eventName: string; accessToken: string; expiresAt: string };
