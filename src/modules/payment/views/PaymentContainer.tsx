"use client";

import { StatusView } from "@/components/ui/layout/StatusView";
import { usePaymentController } from "../controllers/payment.controller";
import { PaymentView } from "./PaymentView";

export function PaymentContainer({ orderId }: { orderId: string }) {
  const screen = usePaymentController(orderId);
  return screen.kind === "payment" ? <PaymentView {...screen.view} /> : <StatusView {...screen.view} />;
}
