"use client";

// Payment dan status pasca-bayar. Requirement: FR-20–25, BR-05–06 (overview). Wireframe 9.4 dan 9.5 menyebut FR-16–20 dan BR-02:
// rujukan keduanya belum selaras. ADR-0005 (timer), ADR-0006 (Midtrans via BE).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emulatePaymentOutcome, orderQuery, queryKeys, startPayment } from "@rusuh/api";
import { serverOffsetMs, toAppError, type AppError, type Order, type PaymentMethod, type PaymentOutcome } from "@rusuh/core";
import { t, type MessageKey } from "@rusuh/i18n";
import type { PaymentResultViewProps, PaymentViewProps, StatusViewProps } from "@rusuh/ui";
import { useAskServerAtExpiry } from "../shared/useAskServerAtExpiry";
import { useCountdown } from "../shared/useCountdown";
import { toPaymentResultProps, toPaymentViewProps } from "./toPaymentViewProps";

export type PaymentScreen =
  | { kind: "payment"; view: PaymentViewProps }
  | { kind: "result"; view: PaymentResultViewProps }
  | { kind: "status"; view: StatusViewProps };

// Kontrol simulasi hanya muncul saat API dimock; di backend asli tombolnya tidak ada.
const mocking = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

function errorKey(error: AppError): MessageKey {
  return error.kind === "network" ? "payment.error.network" : "payment.error.unknown";
}

export function usePaymentViewModel(orderId: string): PaymentScreen {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery(orderQuery(orderId));
  const order = query.data;

  const [method, setMethod] = useState<PaymentMethod>("virtual_account");
  const [copied, setCopied] = useState(false);

  const setOrder = (next: Order) => queryClient.setQueryData(queryKeys.order.detail(orderId), next);
  const pay = useMutation({ mutationFn: (selected: PaymentMethod) => startPayment(orderId, selected), onSuccess: setOrder });
  const emulate = useMutation({ mutationFn: (outcome: PaymentOutcome) => emulatePaymentOutcome(orderId, outcome), onSuccess: setOrder });

  const offsetMs = order ? serverOffsetMs(Date.parse(order.serverNow), query.dataUpdatedAt) : 0;
  const active = order?.status === "awaiting_method" || order?.status === "pending";
  const remainingMs = useCountdown(active ? order.expiresAt : undefined, offsetMs);
  useAskServerAtExpiry(active ? order.expiresAt : undefined, remainingMs, query.refetch);

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!order) {
    if (query.isError) {
      return { kind: "status", view: { title: t("payment.error.title"), message: t(errorKey(toAppError(query.error))), tone: "error" } };
    }
    return { kind: "status", view: { title: t("payment.title"), message: t("payment.loading"), tone: "neutral" } };
  }

  if (order.status === "paid" || order.status === "failed" || order.status === "expired") {
    return {
      kind: "result",
      view: toPaymentResultProps(order, () => router.push(`/orders/${orderId}/ticket`), () => router.push("/")),
    };
  }

  return {
    kind: "payment",
    view: toPaymentViewProps({
      order,
      remainingMs: remainingMs ?? 0,
      method,
      paying: pay.isPending,
      copied,
      onSelectMethod: setMethod,
      onPay: () => pay.mutate(method),
      onCopy: copy,
      mock: mocking ? { onSuccess: () => emulate.mutate("success"), onFail: () => emulate.mutate("fail"), busy: emulate.isPending } : undefined,
    }),
  };
}
