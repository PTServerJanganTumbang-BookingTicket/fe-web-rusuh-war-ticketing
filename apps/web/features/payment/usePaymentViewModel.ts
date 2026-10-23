"use client";

// Payment dan status pasca-bayar. Requirement: FR-20–25, BR-05–06 (overview). Wireframe 9.4 dan 9.5 menyebut FR-16–20 dan BR-02:
// rujukan keduanya belum selaras. ADR-0005 (timer), ADR-0006 (Midtrans via BE), ADR-0017 (screen model).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emulatePaymentOutcome, orderQuery, queryKeys } from "@rusuh/api";
import { isPaymentActive, serverOffsetMs, toAppError, type Order, type PaymentMethod, type PaymentOutcome } from "@rusuh/core";
import { application } from "../shared/composition";
import { useAskServerAtExpiry } from "../shared/useAskServerAtExpiry";
import { useCountdown } from "../shared/useCountdown";
import { derivePaymentScreenState, type PaymentScreenState } from "./paymentModel";

// Kontrol simulasi hanya muncul saat API dimock; di backend asli tombolnya tidak ada.
const mocking = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

export type PaymentViewModel = {
  state: PaymentScreenState;
  actions: {
    selectMethod: (method: PaymentMethod) => void;
    pay: () => void;
    copy: (text: string) => void;
    simulate: (outcome: PaymentOutcome) => void;
    openTicket: () => void;
    goHome: () => void;
  };
};

export function usePaymentViewModel(orderId: string): PaymentViewModel {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery(orderQuery(orderId));
  const order = query.data;

  const [method, setMethod] = useState<PaymentMethod>("virtual_account");
  const [copied, setCopied] = useState(false);

  const setOrder = (next: Order) => queryClient.setQueryData(queryKeys.order.detail(orderId), next);
  const pay = useMutation({
    mutationFn: (command: { order: Order; method: PaymentMethod }) => application.payOrder(command.order, command.method),
    onSuccess: setOrder,
  });
  const emulate = useMutation({ mutationFn: (outcome: PaymentOutcome) => emulatePaymentOutcome(orderId, outcome), onSuccess: setOrder });

  const offsetMs = order ? serverOffsetMs(Date.parse(order.serverNow), query.dataUpdatedAt) : 0;
  const expiresAt = order && isPaymentActive(order) ? order.expiresAt : undefined;
  const remainingMs = useCountdown(expiresAt, offsetMs);
  useAskServerAtExpiry(expiresAt, remainingMs, query.refetch);

  return {
    state: derivePaymentScreenState({
      order,
      error: query.isError ? toAppError(query.error) : undefined,
      remainingMs,
      method,
      submitting: pay.isPending,
      copied,
      simulation: mocking ? { busy: emulate.isPending } : undefined,
    }),
    actions: {
      selectMethod: setMethod,
      pay: () => {
        if (order) pay.mutate({ order, method });
      },
      copy: (text) => {
        void navigator.clipboard?.writeText(text).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      simulate: (outcome) => emulate.mutate(outcome),
      openTicket: () => router.push(`/orders/${orderId}/ticket`),
      goHome: () => router.push("/"),
    },
  };
}
