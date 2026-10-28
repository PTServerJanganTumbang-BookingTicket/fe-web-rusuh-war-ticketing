import type { SessionGateway } from "./SessionGateway";

/** Menyimpan access token dari antrian sebelum customer masuk Detail Ticket. */
export class StartSession {
  private readonly sessionGateway: SessionGateway;

  constructor({ sessionGateway }: { sessionGateway: SessionGateway }) {
    this.sessionGateway = sessionGateway;
  }

  execute(accessToken: string): Promise<void> {
    return this.sessionGateway.start(accessToken);
  }
}
