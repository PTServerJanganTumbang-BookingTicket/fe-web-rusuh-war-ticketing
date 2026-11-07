import type { LocalePreferenceProtocol } from "@/core/domain/locale-preference.protocol";

const LOCALE_KEY = "rusuh.locale";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** localStorage bisa tidak ada (server, test) atau melempar (mode privat, situs diblokir). */
function localStorageOrUndefined(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Bahasa pilihan disimpan di localStorage supaya bertahan antar kunjungan. Tanpa storage, pilihan berlaku sampai
 * halaman ditutup (salinan di memori); bawaan tetap Bahasa Indonesia.
 */
export function createWebStorageLocalePreferenceService(): LocalePreferenceProtocol {
  const storage = localStorageOrUndefined();
  let memory: string | null = null;
  return {
    read() {
      try {
        return storage?.getItem(LOCALE_KEY) ?? memory;
      } catch {
        return memory;
      }
    },
    save(locale) {
      memory = locale;
      try {
        storage?.setItem(LOCALE_KEY, locale);
      } catch {
        // Tetap jalan dengan salinan di memori.
      }
    },
  };
}
