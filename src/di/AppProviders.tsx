"use client";

import { useEffect, useState, type ReactNode } from "react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DependencyProvider } from "@/core/controllers/dependencies.context";
import { useOfflineDialog } from "@/core/controllers/offline-dialog.hook";
import { ActionDialog } from "@/components/ui/layout/ActionDialog";
import { readAppConfig } from "./app-config.reader";
import { createAppContainer } from "./container";
import { shouldRetryQuery } from "@/core/controllers/query-retry.utils";

function createQueryClient(mocking: boolean) {
  // Mode mock: tahan query sampai worker MSW siap, tanpa menahan render children (validasi instant Next
  // membutuhkan children ter-render di server).
  if (mocking && typeof window !== "undefined") onlineManager.setOnline(false);
  return new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: shouldRetryQuery } },
  });
}

/** Dialog "tanpa jaringan" untuk semua halaman yang memasang AppProviders. */
function OfflineDialog() {
  const dialog = useOfflineDialog();
  return dialog ? <ActionDialog {...dialog} /> : null;
}

type AppScope = { container: ReturnType<typeof createAppContainer>; queryClient: QueryClient };

function createAppScope(): AppScope {
  const container = createAppContainer(readAppConfig());
  return { container, queryClient: createQueryClient(container.cradle.appConfig.mocking) };
}

let browserScope: AppScope | undefined;

/**
 * Di browser semua layout memakai container dan QueryClient yang sama. Next menyimpan sampai tiga route tersembunyi
 * (Activity, `cacheComponents`), jadi cache per layout membuat keluar akun di satu route tidak terlihat route lain,
 * dan grant atau tiket antrian di memori hilang saat pindah route. Di server tetap baru per render supaya data
 * tidak bocor antar request.
 */
function getAppScope(): AppScope {
  if (typeof window === "undefined") return createAppScope();
  browserScope ??= createAppScope();
  return browserScope;
}

// Dipasang di layout route yang butuh data klien, bukan di root layout (ADR-0007).
export function AppProviders({ children }: { children: ReactNode }) {
  const [{ container, queryClient }] = useState(getAppScope);

  useEffect(() => {
    // Kondisi ditulis langsung (bukan lewat config) agar bundler membuang import dinamis ini di build tanpa mock.
    if (process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
      const scenario = new URLSearchParams(window.location.search).get("scenario");
      import("@/mocks/browser")
        .then(({ startWorker }) => startWorker(scenario))
        .then(() => onlineManager.setOnline(true))
        // Worker gagal start: lepas query supaya galat jaringan tampil di layar, bukan tertahan offline selamanya.
        .catch(() => onlineManager.setOnline(true));
    }
  }, []);

  return (
    <DependencyProvider dependencies={container.cradle}>
      <QueryClientProvider client={queryClient}>
        {children}
        <OfflineDialog />
      </QueryClientProvider>
    </DependencyProvider>
  );
}
