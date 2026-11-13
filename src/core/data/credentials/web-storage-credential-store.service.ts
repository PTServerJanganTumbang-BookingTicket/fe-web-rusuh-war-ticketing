import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";

const DEVICE_ID_KEY = "rusuh.device_id";
const GRANT_TOKEN_KEY = "rusuh.grant_token";
const GRANT_EVENT_KEY = "rusuh.grant_event";
const QUEUE_TOKEN_PREFIX = "rusuh.queue_token.";
const queueTokenKey = (eventId: string) => `${QUEUE_TOKEN_PREFIX}${eventId}`;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

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

/** Key yang diawali `prefix`. Dikumpulkan dulu karena menghapus sambil menelusuri menggeser indeks. */
function keysWithPrefix(storage: StorageLike | undefined, prefix: string): string[] {
  const keys: string[] = [];
  try {
    for (let index = 0; index < (storage?.length ?? 0); index += 1) {
      const key = storage?.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
  } catch {
    // Storage tidak terbaca: tidak ada yang bisa dihapus dari sana.
  }
  return keys;
}

/**
 * Device ID di localStorage (bertahan antar tab), grant token di sessionStorage (per tab, hilang saat tab ditutup).
 * Grant juga disimpan ke cookie httpOnly lewat `/api/session/start` untuk gerbang `proxy.ts`, tetapi cookie itu
 * tidak terbaca JavaScript, jadi header `X-Grant-Token` diisi dari sini. Token antrian (hanya bila cookie tidak bisa
 * dipakai) juga per tab di sessionStorage, supaya muat ulang halaman kembali ke tempat yang sama di antrian.
 * Grant disimpan bersama event pemiliknya; grant tanpa event (tersimpan sebelum pencatatan ini ada) tidak pernah
 * diberikan untuk permintaan per event.
 */
export function createWebStorageCredentialStoreService(): CredentialStoreProtocol {
  const local = storageOf("localStorage");
  const session = storageOf("sessionStorage");
  let deviceId = read(local, DEVICE_ID_KEY);
  let grantToken = read(session, GRANT_TOKEN_KEY);
  let grantEventId = read(session, GRANT_EVENT_KEY);
  const queueTokens = new Map<string, string>();

  return {
    deviceId() {
      if (!deviceId) {
        deviceId = globalThis.crypto.randomUUID().replaceAll("-", "");
        write(local, DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    },
    grantToken: (eventId) => (eventId === undefined || eventId === grantEventId ? grantToken : null),
    saveGrantToken(eventId, token) {
      grantToken = token;
      grantEventId = eventId;
      write(session, GRANT_TOKEN_KEY, token);
      write(session, GRANT_EVENT_KEY, eventId);
    },
    clearGrantToken() {
      grantToken = null;
      grantEventId = null;
      remove(session, GRANT_TOKEN_KEY);
      remove(session, GRANT_EVENT_KEY);
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
    clearQueueTokens() {
      queueTokens.clear();
      for (const key of keysWithPrefix(session, QUEUE_TOKEN_PREFIX)) remove(session, key);
    },
  };
}
