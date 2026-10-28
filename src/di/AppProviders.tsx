"use client";

import { useEffect, useState, type ReactNode } from "react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DependencyProvider } from "@/ui/di/DependencyContext";
import { readAppConfig } from "./config";
import { createAppContainer } from "./container";

function createQueryClient(mocking: boolean) {
  // Mode mock: tahan query sampai worker MSW siap, tanpa menahan render children (validasi instant Next
  // membutuhkan children ter-render di server).
  if (mocking && typeof window !== "undefined") onlineManager.setOnline(false);
  return new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });
}

// Dipasang di layout route yang butuh data klien, bukan di root layout (ADR-0007).
export function AppProviders({ children }: { children: ReactNode }) {
  const [container] = useState(() => createAppContainer(readAppConfig()));
  const [queryClient] = useState(() => createQueryClient(container.cradle.appConfig.mocking));

  useEffect(() => {
    // Kondisi ditulis langsung (bukan lewat config) agar bundler membuang import dinamis ini di build tanpa mock.
    if (process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
      const scenario = new URLSearchParams(window.location.search).get("scenario");
      import("@/mocks/browser")
        .then(({ startWorker }) => startWorker(scenario))
        .then(() => onlineManager.setOnline(true));
    }
  }, []);

  return (
    <DependencyProvider cradle={container.cradle}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </DependencyProvider>
  );
}
