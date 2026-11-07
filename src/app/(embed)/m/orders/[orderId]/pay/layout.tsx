import { Suspense } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

export default function PaymentLayout({ children }: LayoutProps<"/m/orders/[orderId]/pay">) {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="checkout" />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
