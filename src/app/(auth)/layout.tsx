import { Suspense, type ReactNode } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

// Login, verifikasi link, dan register memakai form klien (ADR-0007: Server Component + form client).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="page" />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
