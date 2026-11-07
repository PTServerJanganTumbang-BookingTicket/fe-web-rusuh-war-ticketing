import { Suspense } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

export default function QueueLayout({ children }: LayoutProps<"/events/[eventId]/queue">) {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="queue" />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
