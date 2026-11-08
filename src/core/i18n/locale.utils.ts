/**
 * Bahasa aktif UI. Bahasa Indonesia tetap bawaan (steering product.md); Inggris tersedia untuk semua layar.
 * Key yang belum diterjemahkan jatuh ke teks Indonesia.
 *
 * State ini sengaja di modul, bukan Context: `t()` dipanggil mapper murni dan Server Component. Server selalu
 * merender `id`; pilihan customer baru diterapkan setelah hidrasi (`useLocale`), jadi tidak ada beda markup.
 */
export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";

/** Tag BCP 47 untuk `Intl` (tanggal, mata uang). */
const INTL_TAGS: Record<Locale, string> = { id: "id-ID", en: "en-US" };

let active: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function getLocale(): Locale {
  return active;
}

export function setLocale(locale: Locale): void {
  if (locale === active) return;
  active = locale;
  listeners.forEach((listener) => listener());
}

/** Untuk `useSyncExternalStore`. Mengembalikan fungsi berhenti berlangganan. */
export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function intlLocale(locale: Locale = active): string {
  return INTL_TAGS[locale];
}
