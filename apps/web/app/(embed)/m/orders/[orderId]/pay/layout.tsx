import { Suspense } from "react";
import { AppProviders } from "@/features/shared/AppProviders";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

// Tanpa navbar dan footer (ADR-0008); hanya ruang aman untuk kartu pembayaran di WebView.
export default function PaymentLayout({ children }: LayoutProps<"/m/orders/[orderId]/pay">) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Suspense fallback={<ScreenLoading />}>
        <AppProviders>{children}</AppProviders>
      </Suspense>
    </main>
  );
}
