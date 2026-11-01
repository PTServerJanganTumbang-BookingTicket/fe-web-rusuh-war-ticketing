"use client";

import { StatusView } from "@/components/ui/layout/StatusView";
import { usePaymentController } from "../controllers/payment.controller";
import { PaymentResultView } from "./PaymentResultView";
import { PaymentView } from "./PaymentView";

export function PaymentContainer({ orderId }: { orderId: string }) {
  const screen = usePaymentController(orderId);
  if (screen.kind === "payment") return <PaymentView {...screen.view} />;
  if (screen.kind === "result") return <PaymentResultView {...screen.view} />;
  return <StatusView {...screen.view} />;
}
