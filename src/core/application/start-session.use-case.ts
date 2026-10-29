import type { SessionProtocol } from "@/core/domain/session.protocol";

/** Menyimpan access token dari antrian sebelum customer masuk Detail Ticket. */
export class StartSessionUseCase {
  private readonly sessionService: SessionProtocol;

  constructor({ sessionService }: { sessionService: SessionProtocol }) {
    this.sessionService = sessionService;
  }

  execute(accessToken: string): Promise<void> {
    return this.sessionService.start(accessToken);
  }
}
