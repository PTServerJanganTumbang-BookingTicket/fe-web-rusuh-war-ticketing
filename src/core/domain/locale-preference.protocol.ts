/** Bahasa pilihan customer yang diingat di perangkat ini. Nilai mentah; validasi di `core/i18n/locale.utils.ts`. */
export interface LocalePreferenceProtocol {
  read(): string | null;
  save(locale: string): void;
}
