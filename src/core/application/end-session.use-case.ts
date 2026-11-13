import type { SessionProtocol } from "@/core/domain/session.protocol";

export type EndSessionUseCase = () => Promise<void>;

/**
 * Melepas grant yang habis sebelum customer antre lagi. Token antrian dipertahankan: join ulang dengan token yang
 * sama menemukan keterlibatan lama (kontrak §3.3), bukan tempat baru.
 */
export function createEndSessionUseCase({
  sessionService,
}: {
  sessionService: SessionProtocol;
}): EndSessionUseCase {
  // Tanpa parameter: `useMutation({ mutationFn })` meneruskan argumennya sendiri, yang tidak boleh sampai ke service.
  return () => sessionService.end();
}
