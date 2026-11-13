"use client";

/**
 * @file payment.controller.ts
 * @description Payment Controller - mengelola state dan logic halaman pembayaran.
 *
 * Requirements: FR-20–25, BR-05–06, 14.32, 14.33, 14.34, 14.35, 14.37, 14.38
 * ADR-0005 (timer), ADR-0006 (Midtrans via BE), ADR-0016 (status lewat polling)
 * ADR-007 (WebView handoff dari aplikasi mobile)
 * Desain: "Satu langkah menuju panggung." (langkah 2 dari 3)
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import type { WebViewContext } from "../domain/webview-handoff.model";
import { isReactNativeWebView, extractHandoffCodeFromFragment } from "../domain/webview-handoff.rules";
import { isAwaitingTickets } from "../domain/order.rules";
import { TICKET_ISSUANCE_MAX_WAIT_MS } from "../domain/payment.constants";
import { getPaymentErrorMessageKey } from "./payment-error.mapper";
import { orderKeys, orderQuery } from "./payment.queries";
import { toPaymentViewProps } from "./payment.mapper";
import type { PaymentViewProps } from "../views/PaymentView";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Screen state untuk payment page */
export type PaymentScreen =
  | { readonly kind: "payment"; readonly view: PaymentViewPropsWithWebView }
  | { readonly kind: "status"; readonly view: StatusViewProps };

/** Modal kinds untuk payment controller */
type PaymentModalKind =
  { readonly kind: "payFailed"; readonly input: PayMutationInput } | { readonly kind: "paymentExpired" };

/** Extended payment view props with WebView context */
export type PaymentViewPropsWithWebView = PaymentViewProps & {
  /** WebView context untuk deteksi dan komunikasi dengan mobile app */
  readonly webViewContext: WebViewContext;
  /** Handler untuk GoPay deeplink (berbeda behavior di WebView vs desktop) */
  readonly onGoPayDeeplink: (url: string) => void;
  /** Handler untuk 401 PAYMENT_SESSION_INVALID pada API call */
  readonly onPaymentSessionInvalid: () => void;
};

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
const PAYMENT_BUSINESS_CODES = [
  "BOOKING_STATUS_INVALID",
  "PAYMENT_WINDOW_CLOSED",
  "MAX_ATTEMPTS_EXCEEDED",
  "PAYMENT_ALREADY_SETTLED",
] as const;

const isPaymentBusinessCode = (code: string): code is (typeof PAYMENT_BUSINESS_CODES)[number] =>
  (PAYMENT_BUSINESS_CODES as readonly string[]).includes(code);

const getErrorMessageKey = (error: AppError): MessageKey => {
  if (error.kind === "network") {
    return "payment.error.network";
  }
  if (error.kind === "api" && isPaymentBusinessCode(error.code)) {
    return getPaymentErrorMessageKey(error.code);
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
  const router = useRouter();
  const queryClient = useQueryClient();
  // Galat tanpa respons atau respons asing saat membayar jadi modal "coba lagi"; pilihan metode tetap tersimpan.
  // Payment expired juga ditampilkan sebagai modal agar user aware sebelum redirect.
  const payModal = useModal<PaymentModalKind>();

  // Dependencies dari DI container
  const {
    getOrderUseCase,
    getAvailableMethodsUseCase,
    getPaymentEventUseCase,
    startPaymentUseCase,
    simulatePaymentUseCase,
    handleWebViewHandoffUseCase,
    endSessionUseCase,
    webViewBridgeService,
    paymentSessionService,
    random,
    appConfig,
  } = useDependencies<PaymentDependencies & CoreDependencies>();

  /* ======================================================================== */
  /*                           WebView Context State                          */
  /* ======================================================================== */

  /**
   * WebView context state untuk deteksi dan komunikasi dengan mobile app.
   *
   * ADR-007 §6: Session hanya di memori halaman (bukan localStorage, cookie, atau URL).
   * ADR-007 §7: Tanpa window.ReactNativeWebView → tampilkan "Buka dari aplikasi".
   */
  const [webViewContext, setWebViewContext] = useState<WebViewContext>(() => {
    // Lazy initialization: deteksi WebView saat render pertama (client-side only)
    // Ini aman karena nilai ini tidak berubah selama lifecycle halaman
    if (typeof window === "undefined") {
      return { isEmbedded: false, hasHandoffCode: false, paymentSession: null };
    }
    return {
      isEmbedded: isReactNativeWebView(),
      hasHandoffCode: !!extractHandoffCodeFromFragment(),
      paymentSession: null,
    };
  });

  /* ======================================================================== */
  /*                                 Queries                                  */
  /* ======================================================================== */

  // WebView: payment session menggantikan grant (ADR-007), jadi query order dan metode menunggu hasil exchange.
  // Tanpa ini request pertama berangkat tanpa kredensial dan 401.
  const sessionReady = !webViewContext.isEmbedded || webViewContext.paymentSession != null;

  // Kontrak §4.4: PAID bisa datang sebelum tiket terbit. Batas tunggu dihitung dari respons PAID pertama tanpa tiket.
  const [ticketsWaitUntil, setTicketsWaitUntil] = useState<number | null>(null);

  // Query untuk order data dengan polling
  const orderQueryResult = useQuery({
    ...orderQuery({ getOrderUseCase, random, ticketsWaitUntil }, orderId),
    enabled: sessionReady,
  });
  const orderData = orderQueryResult.data;

  const awaitingTickets = orderData != null && isAwaitingTickets(orderData);
  if (awaitingTickets && ticketsWaitUntil == null) {
    setTicketsWaitUntil(orderQueryResult.dataUpdatedAt + TICKET_ISSUANCE_MAX_WAIT_MS);
  }
  const issuingTickets =
    awaitingTickets && (ticketsWaitUntil == null || orderQueryResult.dataUpdatedAt < ticketsWaitUntil);

  // Query untuk available payment methods
  const methodsQueryResult = useQuery({
    queryKey: ["payment", "methods", orderId],
    queryFn: () => getAvailableMethodsUseCase(orderId),
    // FAILED tetap butuh daftar metode: customer boleh memilih ulang (BR-06). PAID, EXPIRED, dan SELECTING
    // (belum sampai bayar) tidak.
    enabled:
      sessionReady &&
      orderData != null &&
      orderData.status !== "PAID" &&
      orderData.status !== "EXPIRED" &&
      orderData.status !== "SELECTING",
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
  /*                     WebView Initialization & Handlers                    */
  /* ======================================================================== */

  /**
   * Handle handoff exchange - menukar handoff code dengan payment session.
   *
   * ADR-007 §5.7: POST /payments/handoff/exchange
   * - Handoff code sekali pakai, berlaku 60 detik
   * - Payment session disimpan di memori (BR-27)
   */
  const handleWebViewHandoff = useCallback(async () => {
    const result = await handleWebViewHandoffUseCase(orderId);

    if (result.success) {
      // Store payment session in memory only (BR-27); orderService membacanya untuk header X-Payment-Session
      paymentSessionService.set(result.paymentSession);
      setWebViewContext((prev) => ({
        ...prev,
        paymentSession: result.paymentSession,
      }));
    } else {
      // Handle errors based on type
      // ADR-007 §8: Notify app untuk minta kode baru atau tutup WebView
      if (result.errorCode === "HANDOFF_CODE_INVALID") {
        webViewBridgeService.notifyHandoffExpired(orderId);
      } else if (result.errorCode === "GRANT_EXPIRED") {
        // Grant sudah expired, pembayaran tidak bisa dilanjutkan
        webViewBridgeService.notifyPaymentExpired(orderId);
      } else {
        // Default: minta handoff ulang
        webViewBridgeService.notifyHandoffExpired(orderId);
      }
    }
  }, [orderId, handleWebViewHandoffUseCase, webViewBridgeService, paymentSessionService]);

  /**
   * Handle 401 PAYMENT_SESSION_INVALID pada API call apapun.
   *
   * ADR-007 §8: Notify app untuk minta kode baru.
   * Session invalid berarti halaman dimuat ulang atau session sudah expired.
   */
  const handlePaymentSessionInvalid = useCallback(() => {
    paymentSessionService.set(null);
    webViewBridgeService.notifyHandoffExpired(orderId);
  }, [orderId, webViewBridgeService, paymentSessionService]);

  /**
   * Handle GoPay deeplink - behavior berbeda di WebView vs desktop.
   *
   * ADR-007 §8: Di WebView, kirim OPEN_EXTERNAL ke app karena WebView
   * dikunci ke satu domain (PAYMENT_WEB_URL). External links seperti
   * gojek.link harus dibuka via Linking.openURL di aplikasi mobile.
   *
   * @param url - URL deeplink GoPay (e.g., gojek.link/...)
   */
  const handleGoPayDeeplink = useCallback(
    (url: string) => {
      if (webViewContext.isEmbedded) {
        // WebView: kirim ke app untuk buka via Linking.openURL
        webViewBridgeService.requestOpenExternal(orderId, url);
      } else {
        // Desktop: navigasi normal
        window.location.href = url;
      }
    },
    [orderId, webViewContext.isEmbedded, webViewBridgeService],
  );

  /**
   * Trigger handoff exchange saat mount jika di WebView dengan code.
   *
   * ADR-007 §7: Deteksi sudah dilakukan di lazy init useState.
   * Effect ini hanya untuk trigger async handoff exchange.
   */
  useEffect(() => {
    // Hanya trigger jika di WebView dengan handoff code
    if (webViewContext.isEmbedded && webViewContext.hasHandoffCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Async handoff: setState terjadi setelah await, bukan sinkron di effect body
      void handleWebViewHandoff();
    } else if (webViewContext.isEmbedded) {
      // Dimuat ulang tanpa kode: session sudah hilang dari memori, minta kode baru (ADR-007 §6).
      webViewBridgeService.notifyHandoffExpired(orderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Hanya run sekali saat mount, deteksi sudah di lazy init
  }, []);

  /**
   * Notify app on payment status changes (WebView only).
   *
   * ADR-007 §8: Pesan hanyalah sinyal. Aplikasi akan konfirmasi
   * via GET /bookings/{booking_id} sebelum mengambil tindakan.
   */
  useEffect(() => {
    if (!webViewContext.isEmbedded) return;

    if (orderData?.status === "PAID") {
      webViewBridgeService.notifyPaymentDone(orderId);
    } else if (orderData?.status === "EXPIRED") {
      webViewBridgeService.notifyPaymentExpired(orderId);
    }
  }, [orderData?.status, webViewContext.isEmbedded, orderId, webViewBridgeService]);

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

  // Mutation untuk memulai pembayaran. Selalu POST /payments/{id}: setelah penolakan (FAILED) booking sudah HELD
  // dan tidak ada transaksi Midtrans yang hidup, jadi /retry salah (kontrak §5.2-5.3). Hanya orderService yang
  // tahu ada charge berjalan (ganti metode) dan membatalkannya lebih dulu lewat /retry.
  const payMutation = useMutation({
    mutationFn: ({ selected, selectedBank: bank }: PayMutationInput) =>
      startPaymentUseCase({
        bookingId: orderId,
        method: selected,
        bank,
      }),
    onSuccess: (updatedOrder) => {
      payModal.close();
      updateOrderCache(updatedOrder);
    },
    onError: (failure, input) => {
      const error = toAppError(failure);
      if (isUnexpectedError(error)) payModal.open({ kind: "payFailed", input });
      // Error bisnis (sudah lunas, jendela tertutup, status berubah, batas percobaan): tampilkan pesannya dan
      // sinkronkan order dari server. Tidak ada tombol coba lagi; PAYMENT_ALREADY_SETTLED menunggu poll PAID.
      else if (error.kind === "api" && isPaymentBusinessCode(error.code)) {
        void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      }
    },
  });

  // Mutation untuk simulasi pembayaran (mock mode only)
  const simulateMutation = useMutation({
    mutationFn: (outcome: "PAID" | "FAILED") => simulatePaymentUseCase(orderId, outcome),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
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
  const isOrderActive =
    orderData != null &&
    orderData.status !== "PAID" &&
    orderData.status !== "EXPIRED" &&
    orderData.status !== "SELECTING";

  const expiresAt = isOrderActive ? orderData.paymentTtl.expiresAt : undefined;

  // Hook countdown
  const remainingTimeMs = useCountdown(expiresAt, serverTimeOffset);

  // Saat hitung mundur nol FE hanya bertanya ke server (ADR-0005); jawabannya yang menentukan.
  useAskServerAtExpiry(expiresAt, remainingTimeMs, orderQueryResult.refetch);

  const timeUp = expiresAt != null && remainingTimeMs != null && remainingTimeMs <= 0;
  // Kontrak §5.4: tenggat lewat belum berarti kedaluwarsa. Grace 30 detik (PENDING_CANCELLATION) masih bisa
  // menerima pembayaran, jadi tampilkan "memverifikasi" dan terus polling sampai server menjawab PAID atau EXPIRED.
  const verifying = isOrderActive && (orderData.status === "PENDING_CANCELLATION" || timeUp);

  // Grant sudah dihapus (401): kembali ke antrian event.
  const failure = orderQueryResult.isError ? toAppError(orderQueryResult.error) : undefined;
  const grantGone =
    failure != null && failure.kind !== "network" && "status" in failure && failure.status === 401;
  const queueEventId = orderData?.eventId;
  // Kedaluwarsa hanya bila server yang bilang. Dialog dulu agar customer sadar sebelum pindah halaman.
  const expiredOnServer = orderData?.status === "EXPIRED";
  const selectingOnServer = orderData?.status === "SELECTING";
  useEffect(() => {
    if (webViewContext.isEmbedded || !expiredOnServer) return;
    if (payModal.modal?.kind === "paymentExpired") return;
    payModal.open({ kind: "paymentExpired" });
  }, [webViewContext.isEmbedded, expiredOnServer, payModal]);
  useEffect(() => {
    if (webViewContext.isEmbedded) return;
    // Cookie grant dihapus supaya kunjungan berikutnya tidak memantul ke /book; gagal melepas tidak menahan apa pun.
    if (grantGone || expiredOnServer) endSessionUseCase().catch(() => undefined);
  }, [webViewContext.isEmbedded, grantGone, expiredOnServer, endSessionUseCase]);
  useEffect(() => {
    if (webViewContext.isEmbedded || !queueEventId || !grantGone) return;
    router.replace(`/events/${encodeURIComponent(queueEventId)}/queue`);
  }, [webViewContext.isEmbedded, grantGone, queueEventId, router]);
  // Booking belum sampai bayar (SELECTING): kembali ke Detail Ticket (kontrak §4.4).
  useEffect(() => {
    if (webViewContext.isEmbedded || !queueEventId || !selectingOnServer) return;
    router.replace(`/events/${encodeURIComponent(queueEventId)}/book`);
  }, [webViewContext.isEmbedded, selectingOnServer, queueEventId, router]);
  // WebView: 401 berarti session mati; minta kode baru ke aplikasi (ADR-007 §8).
  useEffect(() => {
    if (webViewContext.isEmbedded && grantGone) {
      paymentSessionService.set(null);
      webViewBridgeService.notifyHandoffExpired(orderId);
    }
  }, [webViewContext.isEmbedded, grantGone, orderId, paymentSessionService, webViewBridgeService]);

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

  // Belum sampai bayar: redirect ke halaman booking sedang berjalan (effect di atas).
  if (selectingOnServer) {
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

  // Tenggat lewat tetapi server belum menyatakan kedaluwarsa: tanpa pilihan bayar atau ganti metode (kontrak §5.4).
  if (verifying) {
    return {
      kind: "status",
      view: {
        ...siteChrome,
        title: t("payment.title"),
        message: t("payment.pending.verifying"),
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

  // Build dialog berdasarkan modal kind
  let dialog: ActionDialogModel | undefined;
  if (openModal?.kind === "paymentExpired") {
    // Dialog waktu pembayaran habis
    dialog = {
      tone: "warning",
      illustration: "confirmation",
      title: t("payment.expired.dialog.title"),
      description: t("payment.expired.dialog.description"),
      primary: { label: t("payment.expired.dialog.cta"), onClick: () => router.replace("/") },
      onDismiss: () => router.replace("/"),
    };
  } else if (openModal?.kind === "payFailed" && payError) {
    const retry = {
      onRetry: () => payMutation.mutate(openModal.input),
      onDismiss: payModal.close,
      retrying: payMutation.isPending,
    };
    // Server gagal memproses charge (5xx): sebut pembayarannya, bukan "terjadi kesalahan" umum.
    dialog =
      payError.kind === "unknown" && (payError.status ?? 0) >= 500
        ? {
            tone: "error",
            illustration: "error",
            title: t("payment.error.chargeFailed.title"),
            description: t("payment.error.chargeFailed.description"),
            primary: { label: t("dialog.retry"), onClick: retry.onRetry, busy: retry.retrying },
            secondary: { label: t("payment.error.chargeFailed.reload"), onClick: () => router.refresh() },
            onDismiss: retry.onDismiss,
          }
        : toRequestFailedDialog(payError, retry);
  }

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
        issuingTickets,
        error: errorMessage,
        onSelectMethod: handleMethodSelect,
        onSelectBank: handleBankSelect,
        onPay: handlePaySubmit,
        onCopy: handleCopyToClipboard,
        mock: mockControls,
      }),
      dialog,
      // WebView context dan handlers (ADR-007)
      webViewContext,
      onGoPayDeeplink: handleGoPayDeeplink,
      onPaymentSessionInvalid: handlePaymentSessionInvalid,
    },
  };
};
