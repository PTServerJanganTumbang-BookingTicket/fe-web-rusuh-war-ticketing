"use client";

import { createContext, useContext, type ReactNode } from "react";

// Nilainya `container.cradle` dari Awilix: objek berisi semua dependensi. Controller tidak mengimpor Awilix
// maupun composition root; ia hanya meminta irisan dependensi yang ia butuhkan lewat tipe (ADR-0015).
const DependencyContext = createContext<object | null>(null);

export function DependencyProvider({
  dependencies,
  children,
}: {
  dependencies: object;
  children: ReactNode;
}) {
  return <DependencyContext.Provider value={dependencies}>{children}</DependencyContext.Provider>;
}

/**
 * Mengambil dependensi dari container. Ambil dengan destructuring (`const { getOrderUseCase } = useDependencies<...>()`),
 * bukan spread, supaya hanya registrasi yang diminta yang di-resolve.
 */
export function useDependencies<T extends object>(): T {
  const dependencies = useContext(DependencyContext);
  if (!dependencies) throw new Error("useDependencies dipanggil di luar DependencyProvider");
  return dependencies as T;
}
