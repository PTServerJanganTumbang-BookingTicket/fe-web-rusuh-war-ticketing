import type { QueueState } from "../domain/queue";
import type { StartSession } from "./ports";

export type EnterBookingRoomDeps = { startSession: StartSession };

/**
 * Giliran tiba: access token antrian dititipkan sebagai sesi booking (FR-06–08, ADR-0008).
 * Mengembalikan `false` tanpa menyentuh port bila antrian belum admitted, karena token baru ada setelah giliran tiba.
 * Kegagalan port dilempar apa adanya (AppFailure) agar ViewModel bisa memetakannya ke pesan.
 */
export async function enterBookingRoom(deps: EnterBookingRoomDeps, queue: QueueState): Promise<boolean> {
  if (queue.status !== "admitted") return false;
  await deps.startSession(queue.accessToken);
  return true;
}
