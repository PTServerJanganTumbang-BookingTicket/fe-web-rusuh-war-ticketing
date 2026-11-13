import type { SessionProtocol } from "@/core/domain/session.protocol";

export type ResetSessionUseCase = () => Promise<void>;

/**
 * Identitas di perangkat ini berganti (keluar akun): grant dan semua token antrian dibuang supaya pengunjung
 * berikutnya tidak mewarisi tempat antre atau slot akun sebelumnya. Berbeda dari `EndSessionUseCase`, yang hanya
 * melepas grant dan mempertahankan token antrian.
 */
export function createResetSessionUseCase({
  sessionService,
}: {
  sessionService: SessionProtocol;
}): ResetSessionUseCase {
  return () => sessionService.reset();
}
