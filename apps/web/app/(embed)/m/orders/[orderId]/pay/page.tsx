import { Suspense } from "react";
import { PaymentContainer } from "@/features/payment/PaymentContainer";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

export default function PaymentPage({ params }: PageProps<"/m/orders/[orderId]/pay">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <Payment params={params} />
    </Suspense>
  );
}

async function Payment({ params }: Pick<PageProps<"/m/orders/[orderId]/pay">, "params">) {
  const { orderId } = await params;
  return <PaymentContainer orderId={orderId} />;
}
