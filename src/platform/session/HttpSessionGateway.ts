import type { AppConfig } from "@/core/application/AppConfig";
import type { SessionGateway } from "@/core/application/session/SessionGateway";
import { AppFailure } from "@/core/domain/errors/appError";
import type { FetchFn } from "../http/FetchHttpClient";

/** Menitipkan access token ke cookie httpOnly lewat route handler same-origin `/api/session/start`. */
export class HttpSessionGateway implements SessionGateway {
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
