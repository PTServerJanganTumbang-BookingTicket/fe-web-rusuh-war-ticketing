"use client";

/**
 * Home Controller — client-side hook untuk polling daftar event.
 * Requirement: 1.4 (refresh ≤5s), 2.1 (redirect ke queue), 2.2 (redirect ke book).
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
  const { listEventsUseCase, random } = useDependencies<CatalogDependencies & CoreDependencies>();

  const eventsQuery = useQuery(eventsQueryOptions({ listEventsUseCase, random }));

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error ? toAppError(eventsQuery.error) : null,
    isRefetching: eventsQuery.isRefetching,
  };
}
