import type { QueueEvent } from "./queue-event.model";
import type { QueueState } from "./queue-state.model";

/**
 * Alur Waiting Room (kontrak §3.1–3.4, ADR-0016): `join` sekali saat masuk antrian, lalu stream SSE dibuka
 * (di luar protocol ini, lihat `QueueUpdatesProtocol`). Posisi dihitung dari `ticket_no − now_serving` tiap pesan
 * stream; `getOwnState` dipanggil saat giliran tiba. `getState` hanya cadangan saat stream tidak tersambung.
 */
export interface QueueProtocol {
  /**
   * Masuk antrian (`POST /queue/join`) dan menyimpan tiketnya. Hanya bila giliran sudah tiba (posisi ≤ 0) atau
   * state bukan `QUEUED`, hasilnya diambil dari `GET /queue/me`. Requirement: FR-06.
   */
  join(eventId: string): Promise<QueueState>;
  /** State customer sendiri dari `GET /queue/me` (grant, kedaluwarsa, dll.). Tanpa tiket tersimpan, join dulu. */
  getOwnState(eventId: string): Promise<QueueState>;
  /**
   * Polling cadangan lewat `GET /queue/serving` saat stream putus: posisi dihitung dari `now_serving`, interval
   * berikutnya dari server. Tanpa tiket tersimpan, join dulu.
   */
  getState(eventId: string): Promise<QueueState>;
  getEvent(eventId: string): Promise<QueueEvent>;
  /** Membuang tiket antrian yang tersimpan di perangkat ini (keluar dari antrian). */
  leave(eventId: string): void;
}
