"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan Signal UI Web Components ke browser.
 * Custom Elements API hanya tersedia di browser, bukan Node.js/SSR.
 * Referensi: ADR-0017
 */
export function SignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    import("@signal-web-ui/core/loader")
      .then(({ defineCustomElements }) => {
        defineCustomElements();
      })
      .catch(() => undefined);
  }, []);

  return <>{children}</>;
}
