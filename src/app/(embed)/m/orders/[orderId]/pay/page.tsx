/**
 * @file page.tsx
 * @description Mobile/Embed Payment Page - Route: /m/orders/[orderId]/pay
 *
 * Halaman pembayaran untuk mobile webview embed.
 * Note: Route param `orderId` merepresentasikan `bookingId` dalam API contract.
 */

import { Suspense } from "react";
import { PaymentContainer } from "@/modules/payment/views/PaymentContainer";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

export default function PaymentPage({ params }: PageProps<"/m/orders/[orderId]/pay">) {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="checkout" />}>
      <Payment params={params} />
    </Suspense>
  );
}

async function Payment({ params }: Pick<PageProps<"/m/orders/[orderId]/pay">, "params">) {
  const resolvedParams = await params;
  // Route param `orderId` represents `bookingId` in API contract
  const bookingId = resolvedParams.orderId;
  return <PaymentContainer bookingId={bookingId} />;
}
