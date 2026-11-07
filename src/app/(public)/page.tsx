/**
 * Home Page — Client-side polling untuk real-time event updates.
 *
 * Strategi rendering (ADR-0007):
 * - CatalogContainer adalah Client Component dengan polling 5s
 * - Menggunakan TanStack Query untuk caching dan real-time updates
 *
 * Ini memenuhi:
 * - Req 1.4: Data ter-refresh dalam ≤5 detik (via client polling)
 * - UX: Loading state yang baik saat pertama kali load
 *
 * Catatan arsitektur:
 * - Sebelumnya menggunakan pure SSR dengan ISR revalidate 15s
 * - Diubah ke client polling untuk memenuhi Req 1.4 (≤5s refresh)
 * - ISR 15s tidak cukup untuk requirement real-time updates
 */

import { Suspense } from "react";
import { CatalogContainer } from "@/modules/catalog/views/CatalogContainer";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

/**
 * HomePage — Root page component.
 *
 * Menggunakan CatalogContainer (Client Component) untuk:
 * - Polling setiap 5s untuk memenuhi Req 1.4
 * - Handle error dan loading state secara client-side
 * - Real-time status updates (AVAILABLE, SELLING_OUT_FAST, SOLD_OUT)
 * - Redirect ke queue/book sesuai queue_state
 */
export default function HomePage() {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="list" />}>
      <CatalogContainer />
    </Suspense>
  );
}
