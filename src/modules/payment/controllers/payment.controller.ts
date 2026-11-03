"use client";

// Payment dan status pasca-bayar. Requirement: FR-20–25, BR-05–06 (overview). Wireframe 9.4 dan 9.5 menyebut FR-16–20 dan BR-02:
// rujukan keduanya belum selaras. ADR-0005 (timer), ADR-0006 (Midtrans via BE), ADR-0016 (status lewat polling).
// SSE dihapus dari modul payment — polling saja, audience 1 orang bukan 300k (lihat Appendix B).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { serverOffsetMs } from "@/core/domain/time/remaining-ms.utils";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useAskServerAtExpiry } from "@/core/controllers/ask-server-at-expiry.hook";
import { useCountdown } from "@/core/controllers/countdown.hook";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { StatusViewProps } from "@/components/ui/layout/StatusView";
import type { PaymentDependencies } from "../application/payment.dependencies";
import type { Order, PaymentMethod } from "../domain/order.model";
import { isFinalOrder } from "../domain/order.rules";
import { DEFAULT_VA_BANK } from "../domain/payment.constants";
import { orderKeys, orderQuery } from "./payment.queries";
import { toPaymentResultProps, toPaymentViewProps } from "./payment.mapper";
import type { PaymentResultViewProps } from "../views/PaymentResultView";
import type { PaymentViewProps } from "../views/PaymentView";

export type PaymentScreen =
  | { kind: "payment"; view: PaymentViewProps }
  | { kind: "result"; view: PaymentResultViewProps }
  | { kind: "status"; view: StatusViewProps };

function errorKey(error: AppError): MessageKey {
  return error.kind === "network" ? "payment.error.network" : "payment.error.unknown";
}

export function usePaymentController(orderId: string): PaymentScreen {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getOrderUseCase, startPaymentUseCase, random, appConfig } = useDependencies<
    PaymentDependencies & CoreDependencies
  >();

  // Polling tanpa SSE — live selalu false, refetchInterval di orderQuery mengatur frekuensi.
  const query = useQuery(orderQuery({ getOrderUseCase, random }, orderId));
  const order = query.data;

  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [copied, setCopied] = useState(false);

  const setOrder = (next: Order) => queryClient.setQueryData(orderKeys.detail(orderId), next);

  const pay = useMutation({
    mutationFn: (selected: PaymentMethod) =>
      startPaymentUseCase({
        bookingId: orderId,
        method: selected,
        bank: selected === "bank_transfer" ? DEFAULT_VA_BANK : undefined,
      }),
    onSuccess: setOrder,
  });

  const offsetMs = order ? serverOffsetMs(Date.parse(order.paymentTtl.serverTime), query.dataUpdatedAt) : 0;
  const active = order && !isFinalOrder(order);
  const remainingMs = useCountdown(active ? order.paymentTtl.expiresAt : undefined, offsetMs);
  useAskServerAtExpiry(active ? order.paymentTtl.expiresAt : undefined, remainingMs, query.refetch);

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
      selectedMethod: method,
      paying: pay.isPending,
      copied,
      onSelectMethod: setMethod,
      onPay: () => pay.mutate(method),
      onCopy: copy,
      // Kontrol simulasi hanya muncul saat API dimock; di backend asli tombolnya tidak ada.
      mock: appConfig.mocking
        ? {
            onSuccess: () => undefined, // simulatePaymentOutcomeUseCase dihapus dari v2.1
            onFail: () => undefined,
            busy: false,
          }
        : undefined,
    }),
  };
}
