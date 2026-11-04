/**
 * @file page.tsx
 * @description Payment Page - Route: /orders/[orderId]/pay
 *
 * Halaman pembayaran untuk order tertentu.
 * Menggunakan Suspense untuk streaming dan loading state.
 */

import { Suspense } from "react";
import { PaymentContainer } from "@/modules/payment/views/PaymentContainer";
import { ScreenLoading } from "@/core/views/ScreenLoading";

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
 */
const PaymentContent = async ({ params }: PaymentContentProps) => {
  const resolvedParams = await params;
  const { orderId } = resolvedParams;

  return <PaymentContainer orderId={orderId} />;
};

/* ========================================================================== */
/*                                Page Export                                 */
/* ========================================================================== */

/**
 * Payment Page Component.
 *
 * Route: /orders/[orderId]/pay
 * Menampilkan halaman pembayaran untuk order dengan ID tertentu.
 *
 * @param props - Page props dengan dynamic route params
 */
const PaymentPage = ({ params }: PaymentPageProps) => {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <PaymentContent params={params} />
    </Suspense>
  );
};

export default PaymentPage;
