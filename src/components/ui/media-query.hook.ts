"use client";

import { useSyncExternalStore } from "react";

/** Breakpoint `sm` Tailwind: di bawah ini layar dianggap mobile (sheet dari bawah, bukan modal di tengah). */
export const MOBILE_QUERY = "(max-width: 639px)";

/**
 * `true` bila media query cocok. Server dan render pertama selalu `false` (desktop), jadi komponen yang terbuka
 * saat halaman dimuat tidak berganti bentuk sebelum hidrasi selesai.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
