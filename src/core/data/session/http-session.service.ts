import type { AppConfig } from "@/core/domain/app-config.model";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { SessionProtocol } from "@/core/domain/session.protocol";
import { AppFailure } from "@/core/domain/app-error";
import type { FetchFn } from "../http/fetch-http.client";

/**
 * Menyimpan grant token dari antrian: ke credential store untuk header `X-Grant-Token`, dan ke cookie httpOnly
 * lewat route handler same-origin `/api/session/start` untuk gerbang halaman di `proxy.ts`. Keduanya mencatat event
 * pemilik grant.
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
  // Permintaan ke route sesi dikirim satu per satu sesuai urutan pemanggilan. Tanpa ini jawaban `end` yang terlambat
  // bisa tiba setelah `start` berikutnya dan menghapus cookie grant yang baru.
  let previous: Promise<void> = Promise.resolve();

  function post(path: string, body?: Record<string, string>): Promise<void> {
    const send = async () => {
      let response: Response;
      try {
        response = await fetchFn(`${appConfig.appBaseUrl}${path}`, {
          method: "POST",
          ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
        });
      } catch {
        throw new AppFailure({ kind: "network" });
      }
      if (!response.ok) throw new AppFailure({ kind: "unknown", status: response.status });
    };
    const result = previous.then(send);
    previous = result.catch(() => undefined);
    return result;
  }

  return {
    start(eventId: string, accessToken: string): Promise<void> {
      credentialStore.saveGrantToken(eventId, accessToken);
      return post("/api/session/start", { eventId, accessToken });
    },

    end(): Promise<void> {
      // Route hanya menghapus cookie yang masih berisi grant ini: grant lebih baru dari tab lain tidak ikut terhapus.
      // Tanpa grant di tab ini (penyimpanan kosong) cookie dihapus apa adanya, supaya gerbang tidak memantulkan
      // customer ke /book dengan cookie yang tidak bisa dipakai.
      const accessToken = credentialStore.grantToken();
      credentialStore.clearGrantToken();
      return post("/api/session/end", accessToken ? { accessToken } : undefined);
    },

    reset(): Promise<void> {
      credentialStore.clearGrantToken();
      credentialStore.clearQueueTokens();
      return post("/api/session/end");
    },
  };
}
