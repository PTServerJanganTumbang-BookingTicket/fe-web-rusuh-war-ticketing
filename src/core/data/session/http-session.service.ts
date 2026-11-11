import type { AppConfig } from "@/core/domain/app-config.model";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { SessionProtocol } from "@/core/domain/session.protocol";
import { AppFailure } from "@/core/domain/app-error";
import type { FetchFn } from "../http/fetch-http.client";

/**
 * Menyimpan grant token dari antrian: ke credential store untuk header `X-Grant-Token`, dan ke cookie httpOnly
 * lewat route handler same-origin `/api/session/start` untuk gerbang halaman di `proxy.ts`.
 */
export function createHttpSessionService({
  appConfig,
  fetchFn,
  credentialStore,
}: {
  appConfig: AppConfig;
  fetchFn: FetchFn;
  credentialStore: CredentialStoreProtocol;
}): SessionProtocol {
  return {
    async start(accessToken: string): Promise<void> {
      credentialStore.saveGrantToken(accessToken);
      let response: Response;
      try {
        response = await fetchFn(`${appConfig.appBaseUrl}/api/session/start`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });
      } catch {
        throw new AppFailure({ kind: "network" });
      }
      if (!response.ok) throw new AppFailure({ kind: "unknown", status: response.status });
    },

    async end(): Promise<void> {
      credentialStore.clearGrantToken();
      let response: Response;
      try {
        response = await fetchFn(`${appConfig.appBaseUrl}/api/session/end`, { method: "POST" });
      } catch {
        throw new AppFailure({ kind: "network" });
      }
      if (!response.ok) throw new AppFailure({ kind: "unknown", status: response.status });
    },
  };
}
