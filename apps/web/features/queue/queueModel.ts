import type { AppError, QueueState } from "@rusuh/core";

// Kondisi layar Waiting Room (ADR-0017). Murni dan tanpa i18n: teks dibentuk di toQueueViewProps.

export type QueueScreenState =
  | { kind: "loading" }
  | { kind: "failed"; error: AppError }
  | { kind: "waiting"; queue: Extract<QueueState, { status: "waiting" }> }
  /** Giliran tiba, sesi booking sedang dititipkan; navigasi menyusul. */
  | { kind: "entering"; eventName: string }
  /** Giliran tiba tetapi menitipkan sesi gagal: slot tetap milik customer, tawarkan coba lagi (jangan PHP). */
  | { kind: "enterFailed"; eventName: string; error: AppError };

export type QueueScreenInput = {
  queue: QueueState | undefined;
  error: AppError | undefined;
  enterError: AppError | undefined;
};

export function deriveQueueScreenState({ queue, error, enterError }: QueueScreenInput): QueueScreenState {
  if (queue?.status === "admitted") {
    return enterError ? { kind: "enterFailed", eventName: queue.eventName, error: enterError } : { kind: "entering", eventName: queue.eventName };
  }
  // Data terakhir tetap ditampilkan walau polling berikutnya gagal.
  if (queue?.status === "waiting") return { kind: "waiting", queue };
  if (error) return { kind: "failed", error };
  return { kind: "loading" };
}
