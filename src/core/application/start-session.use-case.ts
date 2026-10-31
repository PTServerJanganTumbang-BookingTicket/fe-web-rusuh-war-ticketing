import type { SessionProtocol } from "@/core/domain/session.protocol";

export type StartSessionUseCase = (accessToken: string) => Promise<void>;

/** Menyimpan access token dari antrian sebelum customer masuk Detail Ticket. */
export function createStartSessionUseCase({
  sessionService,
}: {
  sessionService: SessionProtocol;
}): StartSessionUseCase {
  return (accessToken) => sessionService.start(accessToken);
}
