"use client";

// Pembayaran dan status pasca-bayar. Requirement: FR-20–25, BR-05–06. ADR-0005 (timer), ADR-0006 (Midtrans via BE),
// ADR-0016 (status lewat polling). Desain: "Satu langkah menuju panggung." (langkah 2 dari 3).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { serverOffsetMs } from "@/core/domain/time/remaining-ms.utils";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useAskServerAtExpiry } from "@/core/controllers/ask-server-at-expiry.hook";
import { useCountdown } from "@/core/controllers/countdown.hook";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { StatusViewProps } from "@/components/ui/layout/StatusView";
import type { PaymentDependencies } from "../application/payment.dependencies";
import type { BankCode, Order, PaymentMethod } from "../domain/order.model";
import { isFinalOrder } from "../domain/order.rules";
import { orderKeys, orderQuery } from "./payment.queries";
import { toPaymentViewProps } from "./payment.mapper";
import type { PaymentViewProps } from "../views/PaymentView";

export type PaymentScreen =
  { kind: "payment"; view: PaymentViewProps } | { kind: "status"; view: StatusViewProps };

function errorKey(error: AppError): MessageKey {
  return error.kind === "network" ? "payment.error.network" : "payment.error.unknown";
}

const COPIED_FEEDBACK_MS = 2_000;

export function usePaymentController(orderId: string): PaymentScreen {
  const queryClient = useQueryClient();
  const {
    getOrderUseCase,
    getAvailableMethodsUseCase,
    getPaymentEventUseCase,
    startPaymentUseCase,
    retryPaymentUseCase,
    simulatePaymentUseCase,
    random,
    appConfig,
  } = useDependencies<PaymentDependencies & CoreDependencies>();

  const query = useQuery(orderQuery({ getOrderUseCase, random }, orderId));
  const order = query.data;
  const methods = useQuery({
    queryKey: ["payment", "methods", orderId],
    queryFn: () => getAvailableMethodsUseCase(orderId),
    enabled: Boolean(order) && !isFinalOrder(order as Order),
  });
  // Detail event hanya pelengkap kartu samping; gagal memuatnya tidak menghentikan pembayaran.
  const event = useQuery({
    queryKey: ["payment", "event", order?.eventId],
    queryFn: () => getPaymentEventUseCase(order?.eventId ?? ""),
    enabled: Boolean(order?.eventId),
    staleTime: Infinity,
  });

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [bank, setBank] = useState<BankCode | null>(null);
  const [bankMissing, setBankMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  const setOrder = (next: Order) => queryClient.setQueryData(orderKeys.detail(orderId), next);
  // Pembayaran yang gagal dibatalkan dulu lalu dimulai ulang dengan metode baru (kontrak `/retry`, BR-06).
  const pay = useMutation({
    mutationFn: ({ selected, selectedBank }: { selected: PaymentMethod; selectedBank?: BankCode }) =>
      order?.status === "FAILED"
        ? retryPaymentUseCase({ bookingId: orderId, method: selected, bank: selectedBank })
        : startPaymentUseCase({ bookingId: orderId, method: selected, bank: selectedBank }),
    onSuccess: setOrder,
  });
  const simulate = useMutation({
    mutationFn: (outcome: "PAID" | "FAILED") => simulatePaymentUseCase(orderId, outcome),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
  });

  const offsetMs = order ? serverOffsetMs(Date.parse(order.paymentTtl.serverTime), query.dataUpdatedAt) : 0;
  const active = order && order.status !== "PAID" && order.status !== "EXPIRED";
  const remainingMs = useCountdown(active ? order.paymentTtl.expiresAt : undefined, offsetMs);
  useAskServerAtExpiry(active ? order.paymentTtl.expiresAt : undefined, remainingMs, query.refetch);

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

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  return {
    kind: "payment",
    view: toPaymentViewProps({
      chrome: toSiteChrome(),
      order,
      event: event.data,
      methods: methods.data ?? [],
      selectedMethod: method,
      selectedBank: bank,
      bankMissing,
      remainingMs: remainingMs ?? 0,
      paying: pay.isPending,
      copied,
      error: pay.isError ? t(errorKey(toAppError(pay.error))) : undefined,
      onSelectMethod: (selected) => {
        setMethod(selected);
        setBankMissing(false);
      },
      onSelectBank: (selected) => {
        setBank(selected);
        setBankMissing(false);
      },
      onPay: () => {
        if (!method) return;
        if (method === "bank_transfer" && !bank) {
          setBankMissing(true);
          return;
        }
        pay.mutate({
          selected: method,
          selectedBank: method === "bank_transfer" ? (bank ?? undefined) : undefined,
        });
      },
      onCopy: copy,
      // Kontrol simulasi hanya muncul saat API dimock; di backend asli tombolnya tidak ada.
      mock: appConfig.mocking
        ? {
            onSuccess: () => simulate.mutate("PAID"),
            onFail: () => simulate.mutate("FAILED"),
            busy: simulate.isPending,
          }
        : undefined,
    }),
  };
}
