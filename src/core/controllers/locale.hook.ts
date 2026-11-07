"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import {
  DEFAULT_LOCALE,
  getLocale,
  isLocale,
  setLocale,
  subscribeLocale,
  type Locale,
} from "@/core/i18n/locale.utils";
import { useDependencies } from "./dependencies.context";

/**
 * Bahasa aktif plus pengganti bahasa. Komponen yang memanggil hook ini dirender ulang saat bahasa berganti, jadi
 * `t()` di controller dan mapper ikut berubah. Dipanggil `useSiteChrome`, sehingga semua layar ber-navbar ikut.
 *
 * Server dan hidrasi memakai Bahasa Indonesia (snapshot server); pilihan tersimpan diterapkan setelah mount supaya
 * markup server dan klien sama.
 */
export function useLocale(): { locale: Locale; changeLocale: (locale: Locale) => void } {
  const { localePreference } = useDependencies<CoreDependencies>();
  const locale = useSyncExternalStore(subscribeLocale, getLocale, () => DEFAULT_LOCALE);

  useEffect(() => {
    const saved = localePreference.read();
    if (isLocale(saved)) setLocale(saved);
  }, [localePreference]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const changeLocale = useCallback(
    (next: Locale) => {
      localePreference.save(next);
      setLocale(next);
    },
    [localePreference],
  );

  return { locale, changeLocale };
}
