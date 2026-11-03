import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";

const DEVICE_ID_KEY = "rusuh.device_id";
const GRANT_TOKEN_KEY = "rusuh.grant_token";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Storage bisa tidak ada (server, test) atau melempar (mode privat); nilai tetap disimpan di memori. */
function storageOf(name: "localStorage" | "sessionStorage"): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window[name];
  } catch {
    return undefined;
  }
}

function read(storage: StorageLike | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage: StorageLike | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Tetap jalan dengan salinan di memori.
  }
}

/**
 * Device ID di localStorage (bertahan antar tab), grant token di sessionStorage (per tab, hilang saat tab ditutup).
 * Grant juga disimpan ke cookie httpOnly lewat `/api/session/start` untuk gerbang `proxy.ts`, tetapi cookie itu
 * tidak terbaca JavaScript, jadi header `X-Grant-Token` diisi dari sini.
 */
export function createWebStorageCredentialStoreService(): CredentialStoreProtocol {
  const local = storageOf("localStorage");
  const session = storageOf("sessionStorage");
  let deviceId = read(local, DEVICE_ID_KEY);
  let grantToken = read(session, GRANT_TOKEN_KEY);

  return {
    deviceId() {
      if (!deviceId) {
        deviceId = globalThis.crypto.randomUUID().replaceAll("-", "");
        write(local, DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    },
    grantToken: () => grantToken,
    saveGrantToken(token) {
      grantToken = token;
      write(session, GRANT_TOKEN_KEY, token);
    },
  };
}
