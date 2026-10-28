"use client";

import { createContext, useContext, type ReactNode } from "react";

// Nilainya `cradle` dari container Awilix. Presentation tidak mengimpor Awilix maupun composition root:
// ia hanya meminta irisan dependensi yang ia butuhkan lewat tipe (ADR-0015).
const DependencyContext = createContext<object | null>(null);

export function DependencyProvider({ cradle, children }: { cradle: object; children: ReactNode }) {
  return <DependencyContext.Provider value={cradle}>{children}</DependencyContext.Provider>;
}

/**
 * Mengambil dependensi dari container. Ambil dengan destructuring (`const { getOrder } = useCradle<...>()`),
 * bukan spread, supaya hanya registrasi yang diminta yang di-resolve.
 */
export function useCradle<T extends object>(): T {
  const cradle = useContext(DependencyContext);
  if (!cradle) throw new Error("useCradle dipanggil di luar DependencyProvider");
  return cradle as T;
}
