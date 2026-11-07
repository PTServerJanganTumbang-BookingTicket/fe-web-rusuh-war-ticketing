/**
 * Public Routes Layout — menyediakan AppProviders untuk halaman publik.
 *
 * Halaman publik yang membutuhkan client-side data fetching (Home, Login, dll)
 * memerlukan DependencyProvider dan QueryClientProvider dari AppProviders.
 *
 * ADR-0007: AppProviders dipasang di layout route yang butuh data klien,
 * bukan di root layout, untuk menjaga static generation di halaman lain.
 */

import { Suspense, type ReactNode } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="list" />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
