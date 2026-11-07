"use client";

/**
 * @file payment.controller.ts
 * @description Payment Controller - mengelola state dan logic halaman pembayaran.
 *
 * Requirements: FR-20–25, BR-05–06
 * ADR-0005 (timer), ADR-0006 (Midtrans via BE), ADR-0016 (status lewat polling)
 * Desain: "Satu langkah menuju panggung." (langkah 2 dari 3)
 */

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { serverOffsetMs } from "@/core/domain/time/remaining-ms.utils";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useAskServerAtExpiry } from "@/core/controllers/ask-server-at-expiry.hook";
import { useCountdown } from "@/core/controllers/countdown.hook";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { useModal, type ActionDialogModel } from "@/core/controllers/modal.hook";
import { isUnexpectedError, toRequestFailedDialog } from "@/core/controllers/common-dialogs.mapper";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { StatusViewProps } from "@/components/ui/layout/StatusView";
import type { PaymentDependencies } from "../application/payment.dependencies";
import type { BankCode, Order, PaymentMethod } from "../domain/order.model";
import { isFinalOrder } from "../domain/order.rules";
import { orderKeys, orderQuery } from "./payment.queries";
import { toPaymentViewProps } from "./payment.mapper";
import type { PaymentViewProps } from "../views/PaymentView";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Screen state untuk payment page */
export type PaymentScreen =
  | { readonly kind: "payment"; readonly view: PaymentViewProps }
  | { readonly kind: "status"; readonly view: StatusViewProps };

/** Mutation input untuk pembayaran */
type PayMutationInput = {
  readonly selected: PaymentMethod;
  readonly selectedBank?: BankCode;
};

/* ========================================================================== */
/*                                 Constants                                  */
/* ========================================================================== */

/** Durasi feedback "Copied!" dalam milliseconds */
const COPIED_FEEDBACK_DURATION_MS = 2_000;

/* ========================================================================== */
/*                             Helper Functions                               */
/* ========================================================================== */

/**
 * Menentukan message key berdasarkan jenis error.
 */
const getErrorMessageKey = (error: AppError): MessageKey => {
  if (error.kind === "network") {
    return "payment.error.network";
  }
  return "payment.error.unknown";
};

/* ========================================================================== */
/*                              Controller Hook                               */
/* ========================================================================== */

/**
 * Payment Controller Hook - mengelola semua state dan logic halaman pembayaran.
 *
 * @param orderId - ID order yang akan dibayar
 * @returns PaymentScreen - state untuk rendering (payment view atau status view)
 */
export const usePaymentController = (orderId: string): PaymentScreen => {
  const siteChrome = useSiteChrome();
  const queryClient = useQueryClient();
  // Galat tanpa respons atau respons asing saat membayar jadi modal "coba lagi"; pilihan metode tetap tersimpan.
  const payModal = useModal<{ kind: "payFailed"; input: PayMutationInput }>();

  // Dependencies dari DI container
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

  /* ======================================================================== */
  /*                                 Queries                                  */
  /* ======================================================================== */

  // Query untuk order data dengan polling
  const orderQueryResult = useQuery(orderQuery({ getOrderUseCase, random }, orderId));
  const orderData = orderQueryResult.data;

  // Query untuk available payment methods
  const methodsQueryResult = useQuery({
    queryKey: ["payment", "methods", orderId],
    queryFn: () => getAvailableMethodsUseCase(orderId),
    enabled: orderData != null && !isFinalOrder(orderData),
  });

  // Query untuk event detail (pelengkap kartu samping, opsional)
  const eventQueryResult = useQuery({
    queryKey: ["payment", "event", orderData?.eventId],
    queryFn: () => getPaymentEventUseCase(orderData?.eventId ?? ""),
    enabled: orderData?.eventId != null,
    staleTime: Infinity,
  });

  /* ======================================================================== */
  /*                               Local State                                */
  /* ======================================================================== */

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankCode | null>(null);
  const [isBankMissing, setIsBankMissing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  /* ======================================================================== */
  /*                                Mutations                                 */
  /* ======================================================================== */

  // Callback untuk update order di cache
  const updateOrderCache = useCallback(
    (updatedOrder: Order) => {
      queryClient.setQueryData(orderKeys.detail(orderId), updatedOrder);
    },
    [queryClient, orderId],
  );

  // Mutation untuk memulai atau retry pembayaran
  const payMutation = useMutation({
    mutationFn: ({ selected, selectedBank: bank }: PayMutationInput) => {
      // Jika order FAILED, gunakan retry flow (BR-06)
      if (orderData?.status === "FAILED") {
        return retryPaymentUseCase({
          bookingId: orderId,
          method: selected,
          bank,
        });
      }
      // Normal flow: start payment
      return startPaymentUseCase({
        bookingId: orderId,
        method: selected,
        bank,
      });
    },
    onSuccess: (updatedOrder) => {
      payModal.close();
      updateOrderCache(updatedOrder);
    },
    onError: (failure, input) => {
      if (isUnexpectedError(toAppError(failure))) payModal.open({ kind: "payFailed", input });
    },
  });

  // Mutation untuk simulasi pembayaran (mock mode only)
  const simulateMutation = useMutation({
    mutationFn: (outcome: "PAID" | "FAILED") => simulatePaymentUseCase(orderId, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });

  /* ======================================================================== */
  /*                           Countdown & Timer                              */
  /* ======================================================================== */

  // Hitung offset waktu server vs client
  const serverTimeOffset =
    orderData != null
      ? serverOffsetMs(Date.parse(orderData.paymentTtl.serverTime), orderQueryResult.dataUpdatedAt)
      : 0;

  // Tentukan apakah countdown aktif
  const isOrderActive = orderData != null && orderData.status !== "PAID" && orderData.status !== "EXPIRED";

  const expiresAt = isOrderActive ? orderData.paymentTtl.expiresAt : undefined;

  // Hook countdown
  const remainingTimeMs = useCountdown(expiresAt, serverTimeOffset);

  // Hook untuk refresh saat TTL hampir habis
  useAskServerAtExpiry(expiresAt, remainingTimeMs, orderQueryResult.refetch);

  /* ======================================================================== */
  /*                           Loading & Error States                         */
  /* ======================================================================== */

  if (orderData == null) {
    // Error state
    if (orderQueryResult.isError) {
      const appError = toAppError(orderQueryResult.error);
      return {
        kind: "status",
        view: {
          ...siteChrome,
          title: t("payment.error.title"),
          message: t(getErrorMessageKey(appError)),
          tone: "error",
        },
      };
    }

    // Loading state
    return {
      kind: "status",
      view: {
        ...siteChrome,
        title: t("payment.title"),
        message: t("payment.loading"),
        tone: "neutral",
        skeleton: "checkout",
      },
    };
  }

  /* ======================================================================== */
  /*                              Event Handlers                              */
  /* ======================================================================== */

  /** Handler untuk copy VA number ke clipboard */
  const handleCopyToClipboard = (textToCopy: string) => {
    void navigator.clipboard?.writeText(textToCopy).catch(() => {
      // Silently fail if clipboard API not available
    });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_DURATION_MS);
  };

  /** Handler untuk memilih metode pembayaran */
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsBankMissing(false);
  };

  /** Handler untuk memilih bank */
  const handleBankSelect = (bank: BankCode) => {
    setSelectedBank(bank);
    setIsBankMissing(false);
  };

  /** Handler untuk submit pembayaran */
  const handlePaySubmit = () => {
    if (selectedMethod == null) {
      return;
    }

    // Validasi: bank wajib untuk transfer
    if (selectedMethod === "bank_transfer" && selectedBank == null) {
      setIsBankMissing(true);
      return;
    }

    // Submit payment
    payMutation.mutate({
      selected: selectedMethod,
      selectedBank: selectedMethod === "bank_transfer" ? (selectedBank ?? undefined) : undefined,
    });
  };

  /* ======================================================================== */
  /*                              Return View Props                           */
  /* ======================================================================== */

  // Build mock controls (hanya muncul di mock mode)
  const mockControls = appConfig.mocking
    ? {
        onSuccess: () => simulateMutation.mutate("PAID"),
        onFail: () => simulateMutation.mutate("FAILED"),
        busy: simulateMutation.isPending,
      }
    : undefined;

  // Galat yang sudah tampil sebagai modal tidak diulang di halaman.
  const payError = payMutation.isError ? toAppError(payMutation.error) : null;
  const errorMessage = payError && !payModal.modal ? t(getErrorMessageKey(payError)) : undefined;
  const openModal = payModal.modal;
  const dialog: ActionDialogModel | undefined =
    openModal && payError
      ? toRequestFailedDialog(payError, {
          onRetry: () => payMutation.mutate(openModal.input),
          onDismiss: payModal.close,
          retrying: payMutation.isPending,
        })
      : undefined;

  return {
    kind: "payment",
    view: {
      ...toPaymentViewProps({
        chrome: siteChrome,
        order: orderData,
        event: eventQueryResult.data,
        methods: methodsQueryResult.data ?? [],
        selectedMethod,
        selectedBank,
        bankMissing: isBankMissing,
        remainingMs: remainingTimeMs ?? 0,
        paying: payMutation.isPending,
        copied: isCopied,
        error: errorMessage,
        onSelectMethod: handleMethodSelect,
        onSelectBank: handleBankSelect,
        onPay: handlePaySubmit,
        onCopy: handleCopyToClipboard,
        mock: mockControls,
      }),
      dialog,
    },
  };
};
