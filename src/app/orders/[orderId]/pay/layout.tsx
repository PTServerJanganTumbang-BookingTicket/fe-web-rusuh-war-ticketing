import { Suspense } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/core/views/ScreenLoading";

export default function PaymentLayout({ children }: LayoutProps<"/orders/[orderId]/pay">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
