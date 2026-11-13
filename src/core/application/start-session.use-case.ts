import type { SessionProtocol } from "@/core/domain/session.protocol";

export type StartSessionUseCase = (eventId: string, accessToken: string) => Promise<void>;

/** Menyimpan grant dari antrian sebuah event sebelum customer masuk Detail Ticket event itu. */
export function createStartSessionUseCase({
  sessionService,
}: {
  sessionService: SessionProtocol;
}): StartSessionUseCase {
  return (eventId, accessToken) => sessionService.start(eventId, accessToken);
}
