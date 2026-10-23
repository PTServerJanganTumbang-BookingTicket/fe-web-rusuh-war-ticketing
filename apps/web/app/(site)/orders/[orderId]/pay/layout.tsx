import { Suspense } from "react";
import { AppProviders } from "@/features/shared/AppProviders";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

export default function PaymentLayout({ children }: LayoutProps<"/orders/[orderId]/pay">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
