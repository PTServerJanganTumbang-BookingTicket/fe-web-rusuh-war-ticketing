import type { AppConfig } from "@/core/domain/app-config.model";
import type { SessionProtocol } from "@/core/domain/session.protocol";
import { AppFailure } from "@/core/domain/app-error";
import type { FetchFn } from "../http/fetch-http.client";

/** Menitipkan access token ke cookie httpOnly lewat route handler same-origin `/api/session/start`. */
export class HttpSessionService implements SessionProtocol {
  private readonly appConfig: AppConfig;
  private readonly fetchFn: FetchFn;

  constructor({ appConfig, fetchFn }: { appConfig: AppConfig; fetchFn: FetchFn }) {
    this.appConfig = appConfig;
    this.fetchFn = fetchFn;
  }

  async start(accessToken: string): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.appConfig.appBaseUrl}/api/session/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
    } catch {
      throw new AppFailure({ kind: "network" });
    }
    if (!response.ok) throw new AppFailure({ kind: "unknown", status: response.status });
  }
}
