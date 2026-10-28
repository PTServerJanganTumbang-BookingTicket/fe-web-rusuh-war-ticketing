import { Suspense } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/ui/ScreenLoading";

export default function PaymentLayout({ children }: LayoutProps<"/m/orders/[orderId]/pay">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
