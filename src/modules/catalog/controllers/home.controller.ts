"use client";

/**
 * Home Controller — client-side hook untuk polling daftar event.
 * Requirement: 1.4 (refresh 10s, dilonggarkan dari 5s), 2.1 (redirect ke queue), 2.2 (redirect ke book).
 * ADR-0004 (TanStack Query), ADR-0007 (rendering strategy).
 *
 * Catatan arsitektur:
 * Home page menggunakan hybrid approach:
 * - Server Component (page.tsx) dengan ISR untuk initial render dan SEO
 * - Client Component (CatalogContainer) dengan polling untuk real-time updates
 *
 * Ini memungkinkan:
 * - Fast initial load dari CDN cache
 * - Real-time status updates sesuai Req 1.4
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import type { CatalogDependencies } from "../application/catalog.dependencies";
import type { Event } from "../domain/event.model";
import { eventsQueryOptions } from "./catalog.queries";

export type HomeControllerState = {
  /** Daftar event dari server. */
  events: Event[];
  /** Sedang memuat data pertama kali. */
  isLoading: boolean;
  /** Error jika gagal mengambil data. */
  error: AppError | null;
  /** Sedang melakukan refetch (polling atau manual). */
  isRefetching: boolean;
  /**
   * Muat ulang manual. Polling berhenti setelah galat kontrak (`pollingStopped`), jadi tombol "Coba lagi" di
   * keadaan kosong/galat inilah jalan pulihnya.
   */
  refetch: () => void;
};

/**
 * Client-side controller untuk Home page dengan polling 5 detik.
 * Digunakan oleh CatalogContainer untuk mendapatkan data real-time.
 *
 * @returns State yang berisi events, loading state, dan error.
 *
 * @example
 * ```tsx
 * function CatalogContainer() {
 *   const { events, isLoading, error } = useHomeController();
 *   if (isLoading) return <ScreenLoading />;
 *   if (error) return <ErrorView error={error} />;
 *   return <HomeView events={events.map(toEventCardProps)} />;
 * }
 * ```
 */
export function useHomeController(): HomeControllerState {
  const { listEventsUseCase, random, captcha } = useDependencies<CatalogDependencies & CoreDependencies>();

  // Opsi dimemoisasi supaya jitter polling tetap sama antar render (lihat `eventsQueryOptions`).
  const options = useMemo(
    () => eventsQueryOptions({ listEventsUseCase, random }),
    [listEventsUseCase, random],
  );
  const eventsQuery = useQuery(options);
  // Kartu bisa langsung membuka antrian: muat skrip CAPTCHA lebih awal bila ada event yang bisa diantri.
  const canJoinQueue = eventsQuery.data?.some(
    (event) => event.display.enabled && event.display.action === "queue",
  );
  useEffect(() => {
    if (canJoinQueue) captcha.warm();
  }, [canJoinQueue, captcha]);
  // Hanya refetch manual (tombol coba lagi) yang terlihat; polling latar tidak merender ulang layar tiap siklus.
  const [retrying, setRetrying] = useState(false);
  const { refetch: refetchEvents } = eventsQuery;
  const refetch = useCallback(() => {
    setRetrying(true);
    void refetchEvents().finally(() => setRetrying(false));
  }, [refetchEvents]);

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error ? toAppError(eventsQuery.error) : null,
    isRefetching: retrying,
    refetch,
  };
}
