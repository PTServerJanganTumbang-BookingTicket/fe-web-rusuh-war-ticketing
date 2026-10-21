"use client";

import { PaymentResultView, PaymentView, StatusView } from "@rusuh/ui";
import { usePaymentViewModel } from "./usePaymentViewModel";

export function PaymentContainer({ orderId }: { orderId: string }) {
  const screen = usePaymentViewModel(orderId);
  if (screen.kind === "payment") return <PaymentView {...screen.view} />;
  if (screen.kind === "result") return <PaymentResultView {...screen.view} />;
  return <StatusView {...screen.view} />;
}
