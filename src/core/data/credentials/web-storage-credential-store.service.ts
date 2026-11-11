import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";

const DEVICE_ID_KEY = "rusuh.device_id";
const GRANT_TOKEN_KEY = "rusuh.grant_token";
const queueTokenKey = (eventId: string) => `rusuh.queue_token.${eventId}`;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

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

function remove(storage: StorageLike | undefined, key: string) {
  try {
    storage?.removeItem(key);
  } catch {
    // Salinan di memori sudah dibuang.
  }
}

/**
 * Device ID di localStorage (bertahan antar tab), grant token di sessionStorage (per tab, hilang saat tab ditutup).
 * Grant juga disimpan ke cookie httpOnly lewat `/api/session/start` untuk gerbang `proxy.ts`, tetapi cookie itu
 * tidak terbaca JavaScript, jadi header `X-Grant-Token` diisi dari sini. Token antrian (hanya bila cookie tidak bisa
 * dipakai) juga per tab di sessionStorage, supaya muat ulang halaman kembali ke tempat yang sama di antrian.
 */
export function createWebStorageCredentialStoreService(): CredentialStoreProtocol {
  const local = storageOf("localStorage");
  const session = storageOf("sessionStorage");
  let deviceId = read(local, DEVICE_ID_KEY);
  let grantToken = read(session, GRANT_TOKEN_KEY);
  const queueTokens = new Map<string, string>();

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
    clearGrantToken() {
      grantToken = null;
      remove(session, GRANT_TOKEN_KEY);
    },
    queueToken: (eventId) => queueTokens.get(eventId) ?? read(session, queueTokenKey(eventId)),
    saveQueueToken(eventId, token) {
      queueTokens.set(eventId, token);
      write(session, queueTokenKey(eventId), token);
    },
    clearQueueToken(eventId) {
      queueTokens.delete(eventId);
      remove(session, queueTokenKey(eventId));
    },
  };
}
