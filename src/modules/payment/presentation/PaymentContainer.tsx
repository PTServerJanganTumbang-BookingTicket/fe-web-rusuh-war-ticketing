"use client";

import { StatusView } from "@/ui/design-system/layout/StatusView";
import { usePaymentViewModel } from "./usePaymentViewModel";
import { PaymentResultView } from "./views/PaymentResultView";
import { PaymentView } from "./views/PaymentView";

export function PaymentContainer({ orderId }: { orderId: string }) {
  const screen = usePaymentViewModel(orderId);
  if (screen.kind === "payment") return <PaymentView {...screen.view} />;
  if (screen.kind === "result") return <PaymentResultView {...screen.view} />;
  return <StatusView {...screen.view} />;
}
