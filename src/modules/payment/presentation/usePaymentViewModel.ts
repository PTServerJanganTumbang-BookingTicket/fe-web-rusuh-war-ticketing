"use client";

// Payment dan status pasca-bayar. Requirement: FR-20–25, BR-05–06 (overview). Wireframe 9.4 dan 9.5 menyebut FR-16–20 dan BR-02:
// rujukan keduanya belum selaras. ADR-0005 (timer), ADR-0006 (Midtrans via BE), ADR-0016 (status lewat SSE).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/dependencies";
import { toAppError, type AppError } from "@/core/domain/errors/appError";
import { serverOffsetMs } from "@/core/domain/time/remainingMs";
import { useCradle } from "@/ui/di/DependencyContext";
import { useLiveUpdates } from "@/ui/hooks/useLiveUpdates";
import { useAskServerAtExpiry } from "@/ui/hooks/useAskServerAtExpiry";
import { useCountdown } from "@/ui/hooks/useCountdown";
import { t, type MessageKey } from "@/ui/i18n/t";
import type { StatusViewProps } from "@/ui/design-system/layout/StatusView";
import type { PaymentDependencies } from "../application/dependencies";
import type { Order, PaymentMethod, PaymentOutcome } from "../domain/order";
import { isFinalOrder, orderKeys, orderQuery } from "./paymentQueries";
import { toPaymentResultProps, toPaymentViewProps } from "./toPaymentViewProps";
import type { PaymentResultViewProps } from "./views/PaymentResultView";
import type { PaymentViewProps } from "./views/PaymentView";

export type PaymentScreen =
  | { kind: "payment"; view: PaymentViewProps }
  | { kind: "result"; view: PaymentResultViewProps }
  | { kind: "status"; view: StatusViewProps };

function errorKey(error: AppError): MessageKey {
  return error.kind === "network" ? "payment.error.network" : "payment.error.unknown";
}

export function usePaymentViewModel(orderId: string): PaymentScreen {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getOrder, watchOrder, startPayment, simulatePaymentOutcome, random, appConfig } = useCradle<
    PaymentDependencies & CoreDependencies
  >();
  const live = useLiveUpdates<Order>({
    queryKey: orderKeys.detail(orderId),
    watch: (observer) => watchOrder.execute(orderId, observer),
    until: isFinalOrder,
  });
  const query = useQuery(orderQuery({ getOrder, random }, orderId, live));
  const order = query.data;

  const [method, setMethod] = useState<PaymentMethod>("virtual_account");
  const [copied, setCopied] = useState(false);

  const setOrder = (next: Order) => queryClient.setQueryData(orderKeys.detail(orderId), next);
  const pay = useMutation({
    mutationFn: (selected: PaymentMethod) => startPayment.execute(orderId, selected),
    onSuccess: setOrder,
  });
  const emulate = useMutation({
    mutationFn: (outcome: PaymentOutcome) => simulatePaymentOutcome.execute(orderId, outcome),
    onSuccess: setOrder,
  });

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
      return {
        kind: "status",
        view: {
          title: t("payment.error.title"),
          message: t(errorKey(toAppError(query.error))),
          tone: "error",
        },
      };
    }
    return {
      kind: "status",
      view: { title: t("payment.title"), message: t("payment.loading"), tone: "neutral" },
    };
  }

  if (isFinalOrder(order)) {
    return {
      kind: "result",
      view: toPaymentResultProps(
        order,
        () => router.push(`/orders/${orderId}/ticket`),
        () => router.push("/"),
      ),
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
      // Kontrol simulasi hanya muncul saat API dimock; di backend asli tombolnya tidak ada.
      mock: appConfig.mocking
        ? {
            onSuccess: () => emulate.mutate("success"),
            onFail: () => emulate.mutate("fail"),
            busy: emulate.isPending,
          }
        : undefined,
    }),
  };
}
