import { Suspense } from "react";
import { PaymentContainer } from "@/modules/payment/presentation/PaymentContainer";
import { ScreenLoading } from "@/ui/ScreenLoading";

export default function PaymentPage({ params }: PageProps<"/orders/[orderId]/pay">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <Payment params={params} />
    </Suspense>
  );
}

async function Payment({ params }: Pick<PageProps<"/orders/[orderId]/pay">, "params">) {
  const { orderId } = await params;
  return <PaymentContainer orderId={orderId} />;
}
