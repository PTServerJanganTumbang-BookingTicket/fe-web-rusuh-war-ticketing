/**
 * @file page.tsx
 * @description Payment Page - Route: /orders/[orderId]/pay
 *
 * Halaman pembayaran untuk order tertentu.
 * Menggunakan Suspense untuk streaming dan loading state.
 *
 * Note: Route param `orderId` di sini merepresentasikan `bookingId` dalam
 * API contract. Naming `orderId` dipertahankan untuk konsistensi dengan
 * folder route Next.js, namun secara semantik ini adalah booking ID.
 */

import { Suspense } from "react";
import { PaymentContainer } from "@/modules/payment/views/PaymentContainer";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

type PaymentPageProps = PageProps<"/orders/[orderId]/pay">;

type PaymentContentProps = {
  readonly params: PaymentPageProps["params"];
};

/* ========================================================================== */
/*                             Payment Content                                */
/* ========================================================================== */

/**
 * Komponen async untuk mengambil params dan render PaymentContainer.
 * Dipisah untuk memungkinkan Suspense boundary yang proper.
 *
 * @param params - Route params containing bookingId (as orderId in route)
 */
const PaymentContent = async ({ params }: PaymentContentProps) => {
  const resolvedParams = await params;
  // Route param `orderId` represents `bookingId` in API contract
  const bookingId = resolvedParams.orderId;

  return <PaymentContainer bookingId={bookingId} />;
};

/* ========================================================================== */
/*                                Page Export                                 */
/* ========================================================================== */

/**
 * Payment Page Component.
 *
 * Route: /orders/[orderId]/pay
 * Menampilkan halaman pembayaran untuk booking dengan ID tertentu.
 * Note: `orderId` dalam route = `bookingId` dalam API contract.
 *
 * @param props - Page props dengan dynamic route params
 */
const PaymentPage = ({ params }: PaymentPageProps) => {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="checkout" />}>
      <PaymentContent params={params} />
    </Suspense>
  );
};

export default PaymentPage;
