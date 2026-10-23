"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAuthRequired, toAppError } from "@rusuh/core";
import { loginRedirectPath } from "./authRedirect";

const mocking = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

function createClient() {
  // Mode mock: tahan query sampai worker MSW siap, tanpa menahan render children (validasi instant Next
  // membutuhkan children ter-render di server).
  if (mocking && typeof window !== "undefined") onlineManager.setOnline(false);
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // 401 tidak pulih dengan mencoba lagi; langsung ke login. Galat lain tetap dicoba ulang (default 3 kali).
        retry: (failureCount, error) => !isAuthRequired(toAppError(error)) && failureCount < 3,
      },
    },
  });
}

// Dipasang di layout route yang butuh data klien, bukan di root layout (ADR-0007).
export function AppProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState(createClient);

  // Satu tempat untuk 401 dari endpoint terproteksi mana pun, supaya layar tidak masing-masing menanganinya (ADR-0010).
  // Navigasi klien (bukan muat ulang halaman): state aplikasi dan worker mock tetap hidup sampai login selesai.
  useEffect(() => {
    const redirectOnAuthError = (event: { type: string; action?: { type: string; error?: unknown } }) => {
      if (event.type !== "updated" || event.action?.type !== "error") return;
      const target = loginRedirectPath(toAppError(event.action.error), window.location);
      if (target) router.replace(target);
    };
    const unsubscribeQueries = client.getQueryCache().subscribe(redirectOnAuthError);
    const unsubscribeMutations = client.getMutationCache().subscribe(redirectOnAuthError);
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [client, router]);

  useEffect(() => {
    // Kondisi ditulis langsung (bukan lewat variabel) agar bundler membuang import dinamis ini di build tanpa mock.
    if (process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
      const scenario = new URLSearchParams(window.location.search).get("scenario");
      import("@rusuh/mocks/browser")
        .then(({ startWorker }) => startWorker(scenario))
        .then(() => onlineManager.setOnline(true));
    }
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
