import type { QueueProtocol } from "../domain/queue.protocol";

export type LeaveQueueUseCase = (eventId: string) => void;

/**
 * Keluar dari antrian di perangkat ini: tiket yang tersimpan dibuang supaya masuk lagi memulai dari join. Kontrak belum
 * punya endpoint keluar antrian, jadi nomor antrian baru bergantung pada BE saat join ulang.
 */
export function createLeaveQueueUseCase({
  queueService,
}: {
  queueService: QueueProtocol;
}): LeaveQueueUseCase {
  return (eventId) => queueService.leave(eventId);
}
