import { Suspense } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

export default function Layout({ children }: LayoutProps<"/tickets">) {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="list" />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
