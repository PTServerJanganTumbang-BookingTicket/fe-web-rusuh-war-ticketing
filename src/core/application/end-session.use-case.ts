import type { SessionProtocol } from "@/core/domain/session.protocol";

export type EndSessionUseCase = () => Promise<void>;

/** Melepas grant yang habis sebelum customer antre lagi. */
export function createEndSessionUseCase({
  sessionService,
}: {
  sessionService: SessionProtocol;
}): EndSessionUseCase {
  return () => sessionService.end();
}
