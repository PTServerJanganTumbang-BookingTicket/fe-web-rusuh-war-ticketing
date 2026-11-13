/**
 * @file payment.mapper.ts
 * @description Payment Mapper - transformasi data domain ke view props.
 *
 * Desain: "Satu langkah menuju panggung." (langkah 2 dari 3), lalu status akhir di langkah 3.
 * Requirements: 6.1–6.19, BR-05, BR-06.
 */

import { COUNTDOWN_URGENT_AT_MS } from "@/core/domain/time/countdown.constants";
import { formatMmSs } from "@/core/domain/time/format-mm-ss.utils";
import { formatIdr } from "@/core/controllers/format-currency.utils";
import type { SiteChrome } from "@/core/controllers/site-chrome.utils";
import { t } from "@/core/i18n/t.utils";
import type {
  AvailableMethod,
  BankCode,
  Order,
  OrderItem,
  PaymentInstruction,
  PaymentMethod,
} from "../domain/order.model";
import type { PaymentEvent } from "../domain/payment-event.model";
import type {
  PaidTicketItem,
  PaymentInstructionView,
  PaymentStage,
  PaymentViewProps,
} from "../views/PaymentView";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Input untuk mapping ke PaymentViewProps */
export type PaymentViewInput = {
  readonly chrome: SiteChrome;
  readonly order: Order;
  readonly event?: PaymentEvent;
  readonly methods: readonly AvailableMethod[];
  readonly selectedMethod: PaymentMethod | null;
  readonly selectedBank: BankCode | null;
  readonly bankMissing: boolean;
  readonly remainingMs: number;
  readonly paying: boolean;
  readonly copied: boolean;
  /** PAID tetapi tiket belum terbit dan batas tunggu belum lewat (kontrak §4.4). */
  readonly issuingTickets?: boolean;
  readonly error?: string;
  readonly onSelectMethod: (method: PaymentMethod) => void;
  readonly onSelectBank: (bank: BankCode) => void;
  readonly onPay: () => void;
  readonly onCopy: (text: string) => void;
  readonly mock?: {
    readonly onSuccess: () => void;
    readonly onFail: () => void;
    readonly busy: boolean;
  };
};

/** Aggregated line item untuk order summary */
type CategorySummary = {
  readonly count: number;
  readonly priceIdr: number;
};

/* ========================================================================== */
/*                                 Formatters                                 */
/* ========================================================================== */

/** Formatter tanggal event dalam format Indonesia */
const eventDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/* ========================================================================== */
/*                         Instruction View Mapper                            */
/* ========================================================================== */

/**
 * Mengubah PaymentInstruction domain ke PaymentInstructionView untuk UI.
 */
const mapInstructionToView = (
  instruction: PaymentInstruction,
  isCopied: boolean,
  onCopyHandler: (text: string) => void,
): PaymentInstructionView => {
  // Virtual Account instruction
  if (instruction.type === "bank_transfer") {
    const bankLabel = instruction.bank.toUpperCase();
    const vaLabel = t("payment.va.label", { bank: bankLabel });
    const copyLabel = isCopied ? t("payment.va.copied") : t("payment.va.copy");

    return {
      type: "virtual_account",
      label: vaLabel,
      number: instruction.vaNumber,
      copy: {
        label: copyLabel,
        onClick: () => onCopyHandler(instruction.vaNumber),
      },
    };
  }

  // QR (GoPay) instruction
  const qrLabel = t("payment.qr.label");
  const qrHint = t("payment.pending.qr");
  const openAppLabel = t("payment.pending.openApp");

  return {
    type: "qr",
    qrUrl: instruction.qrUrl,
    qrLabel,
    hint: qrHint,
    openApp: {
      label: openAppLabel,
      href: instruction.deeplinkUrl,
    },
  };
};

/* ========================================================================== */
/*                          Order Status Mapper                               */
/* ========================================================================== */

/**
 * Menentukan status badge untuk order.
 */
const mapOrderStatus = (order: Order): PaymentViewProps["order"]["status"] => {
  const statusMap: Record<string, PaymentViewProps["order"]["status"]> = {
    PAID: { label: t("payment.status.paid"), tone: "success" },
    FAILED: { label: t("payment.status.failed"), tone: "error" },
    EXPIRED: { label: t("payment.status.expired"), tone: "error" },
  };

  const matchedStatus = statusMap[order.status];
  if (matchedStatus != null) {
    return matchedStatus;
  }

  // Default: awaiting payment
  return { label: t("payment.status.awaiting"), tone: "warning" };
};

/* ========================================================================== */
/*                            Stage Mappers                                   */
/* ========================================================================== */

/**
 * Path e-tiket dari BE (`/tickets/{id}/eticket?t=...`) ke halaman e-tiket web (`/tickets/{id}?t=...`).
 * Token `?t=` dibawa apa adanya: tamu membuka e-tiket tanpa akun dan tanpa menunggu email (NFR-10).
 */
export const toETicketHref = (ticketId: string, eticketUrl: string): string => {
  const token = new URL(eticketUrl, "http://localhost").searchParams.get("t");
  const path = `/tickets/${encodeURIComponent(ticketId)}`;
  return token ? `${path}?t=${encodeURIComponent(token)}` : path;
};

/** Satu baris per kursi: tautan e-tiket bila sudah terbit, selain itu keterangan menunggu atau lewat email. */
const toPaidTicketItem = (item: OrderItem, issuing: boolean): PaidTicketItem => {
  const base = { category: item.category, nikMasked: item.nikMasked };
  if (item.ticketId != null && item.eticketUrl != null) {
    return {
      ...base,
      code: item.ticketId,
      link: {
        label: t("payment.result.paid.tickets.open"),
        href: toETicketHref(item.ticketId, item.eticketUrl),
      },
    };
  }
  if (item.ticketId != null) {
    return { ...base, code: item.ticketId, note: t("payment.result.paid.tickets.unavailable") };
  }
  const noteKey = issuing ? "payment.result.paid.tickets.issuing" : "payment.result.paid.tickets.byEmail";
  return { ...base, note: t(noteKey) };
};

/** Hasil PAID: tiap kursi dengan tautan e-tiketnya; "Tiket saya" hanya untuk customer yang masuk (ADR-0023). */
const createPaidStage = (order: Order, issuing: boolean, signedIn: boolean): PaymentStage => {
  const categoryNames = [...new Set(order.items.map((item) => item.category))].join(", ");
  const explore = { label: t("payment.result.paid.secondary"), href: "/" };

  return {
    kind: "result",
    tone: "success",
    title: t("payment.result.paid.title"),
    message: t(issuing ? "payment.result.paid.issuing" : "payment.result.paid.message"),
    detail: t("payment.result.paid.ticket", {
      quantity: order.items.length,
      names: categoryNames,
    }),
    tickets: {
      title: t("payment.result.paid.tickets.title"),
      items: order.items.map((item) => toPaidTicketItem(item, issuing)),
    },
    primary: signedIn ? { label: t("payment.result.paid.cta"), href: "/tickets" } : explore,
    secondary: signedIn ? explore : undefined,
  };
};

/**
 * Membuat result stage untuk order yang sudah selesai (PAID/EXPIRED).
 */
const createResultStage = (input: PaymentViewInput): PaymentStage => {
  const { order } = input;
  if (order.status === "PAID") {
    return createPaidStage(order, input.issuingTickets ?? false, input.chrome.nav.account != null);
  }

  // Expired: waktu habis
  return {
    kind: "result",
    tone: "warning",
    title: t("payment.result.expired.title"),
    message: t("payment.result.expired.message"),
    primary: { label: t("payment.result.home"), href: "/" },
  };
};

/**
 * Membuat select stage untuk pemilihan metode pembayaran.
 */
const createSelectStage = (input: PaymentViewInput): PaymentStage => {
  const { methods, selectedMethod, selectedBank, order, bankMissing, onSelectMethod, onSelectBank } = input;

  // Cari bank options dari metode bank_transfer
  const bankTransferMethod = methods.find((method) => method.id === "bank_transfer");
  const availableBanks = bankTransferMethod?.banks ?? [];

  // Build method options
  const methodOptions = methods.map((method) => {
    const iconType = method.id === "gopay" ? "wallet" : "bank";
    const methodTitle = t(`payment.option.${method.id}.title`);
    const methodDescription = method.enabled
      ? t(`payment.option.${method.id}.description`)
      : t("payment.option.unavailable");

    return {
      id: method.id,
      icon: iconType as "bank" | "wallet",
      title: methodTitle,
      description: methodDescription,
      selected: selectedMethod === method.id,
      disabled: !method.enabled,
      onSelect: () => onSelectMethod(method.id),
    };
  });

  // Build bank options (hanya jika bank_transfer dipilih)
  const showBankSelection = selectedMethod === "bank_transfer" && availableBanks.length > 0;
  const bankSelectionConfig = showBankSelection
    ? {
        label: t("payment.bank.label"),
        error: bankMissing ? t("payment.bank.required") : undefined,
        options: availableBanks.map((bank) => ({
          code: bank.code,
          name: bank.name,
          selected: selectedBank === bank.code,
          onSelect: () => onSelectBank(bank.code),
        })),
      }
    : undefined;

  // Note untuk metode yang dipilih
  const methodNote = selectedMethod != null ? t(`payment.option.${selectedMethod}.note`) : undefined;

  // Failed notice jika pembayaran sebelumnya gagal
  const failedNoticeText = order.status === "FAILED" ? t("payment.failedNotice") : undefined;

  return {
    kind: "select",
    title: t("payment.method.label"),
    failedNotice: failedNoticeText,
    methods: methodOptions,
    banks: bankSelectionConfig,
    note: methodNote,
  };
};

/**
 * Membuat pending stage untuk menunggu pembayaran.
 */
const createPendingStage = (input: PaymentViewInput): PaymentStage => {
  const { order, copied, onCopy, mock } = input;

  // Order harus punya instruction untuk pending stage
  if (order.instruction == null) {
    // Fallback ke select stage jika tidak ada instruction
    return createSelectStage(input);
  }

  const instructionView = mapInstructionToView(order.instruction, copied, onCopy);

  // Mock controls untuk testing
  const mockConfig =
    mock != null
      ? {
          title: t("payment.mock.title"),
          success: {
            label: t("payment.mock.success"),
            onClick: mock.onSuccess,
            disabled: mock.busy,
          },
          fail: {
            label: t("payment.mock.fail"),
            onClick: mock.onFail,
            disabled: mock.busy,
          },
        }
      : undefined;

  return {
    kind: "pending",
    title: t("payment.pending.heading"),
    note: t("payment.pending.note"),
    instruction: instructionView,
    mock: mockConfig,
  };
};

/**
 * Menentukan stage yang sesuai berdasarkan state order.
 */
const determineCurrentStage = (input: PaymentViewInput): PaymentStage => {
  const { order } = input;

  // Terminal states: PAID atau EXPIRED
  if (order.status === "PAID" || order.status === "EXPIRED") {
    return createResultStage(input);
  }

  // Awaiting payment: tampilkan instruksi pembayaran
  const isAwaitingPayment = order.status === "AWAITING_PAYMENT" || order.status === "PENDING_CANCELLATION";
  if (isAwaitingPayment && order.instruction != null) {
    return createPendingStage(input);
  }

  // Default: pilih metode pembayaran
  return createSelectStage(input);
};

/* ========================================================================== */
/*                              Main Mapper                                   */
/* ========================================================================== */

/**
 * Mengubah PaymentViewInput ke PaymentViewProps untuk rendering.
 */
export const toPaymentViewProps = (input: PaymentViewInput): PaymentViewProps => {
  const { order, event, remainingMs, chrome, error, paying, selectedMethod, onPay } = input;

  const currentStage = determineCurrentStage(input);
  const isPaymentComplete = order.status === "PAID";

  // Event title
  const eventTitle =
    event != null ? t("checkout.event.name", { name: event.name, city: event.city }) : order.eventName;

  // Aggregate items by category
  const categoryMap = new Map<string, CategorySummary>();
  for (const item of order.items) {
    const existing = categoryMap.get(item.category);
    if (existing != null) {
      categoryMap.set(item.category, {
        count: existing.count + 1,
        priceIdr: existing.priceIdr,
      });
    } else {
      categoryMap.set(item.category, {
        count: 1,
        priceIdr: item.priceIdr,
      });
    }
  }

  // Build summary lines
  const summaryLines = [...categoryMap].map(([category, summary]) => ({
    label: t("checkout.summary.line", { category, count: summary.count }),
    detail: t("checkout.summary.each", { price: formatIdr(summary.priceIdr) }),
    amount: formatIdr(summary.priceIdr * summary.count),
  }));

  // Header config
  const headerConfig = {
    breadcrumb: [
      { label: t("checkout.breadcrumb.home"), href: "/" },
      { label: event?.name ?? order.eventName },
      { label: t("payment.title") },
    ],
    steps: [
      { label: t("checkout.step.select"), state: "done" as const },
      {
        label: t("checkout.step.payment"),
        state: isPaymentComplete ? ("done" as const) : ("current" as const),
      },
      {
        label: t("checkout.step.done"),
        state: isPaymentComplete ? ("current" as const) : ("upcoming" as const),
      },
    ],
    heading: t("payment.heading"),
    subtitle: t(
      currentStage.kind === "result"
        ? `payment.result.${isPaymentComplete ? "paid" : "expired"}.subtitle`
        : "payment.subtitle",
    ),
  };

  // Countdown config (tidak tampil jika sudah selesai)
  const shouldShowCountdown = !isPaymentComplete && order.status !== "EXPIRED";
  const countdownConfig = shouldShowCountdown
    ? {
        title: t("payment.countdown.heading"),
        hint: t("payment.countdown.hint"),
        value: formatMmSs(remainingMs),
        urgent: remainingMs <= COUNTDOWN_URGENT_AT_MS,
        urgentLabel: t("payment.countdown.urgent"),
      }
    : undefined;

  // Event card config
  const eventCardConfig =
    event != null
      ? {
          imageUrl: event.imageUrl,
          tag: t("checkout.event.tag", { category: event.category, city: event.city }),
          name: eventTitle,
          date: eventDateFormatter.format(new Date(event.date)),
          venue: `${event.venue}, ${event.city}`,
        }
      : undefined;

  // Pay button config (hanya di select stage)
  const isPayDisabled = paying || selectedMethod == null || remainingMs <= 0;
  const payButtonConfig =
    currentStage.kind === "select"
      ? {
          label: paying ? t("payment.paying") : t("payment.pay"),
          busy: paying,
          disabled: isPayDisabled,
          onClick: onPay,
        }
      : undefined;

  // Terms (hanya di select stage)
  const termsText = currentStage.kind === "select" ? t("payment.terms") : undefined;

  return {
    ...chrome,
    header: headerConfig,
    order: {
      label: t("payment.header.order", { orderId: order.bookingId }),
      status: mapOrderStatus(order),
    },
    countdown: countdownConfig,
    error,
    stage: currentStage,
    secure: {
      title: t("payment.secure.title"),
      body: t("payment.secure.body"),
    },
    event: eventCardConfig,
    summary: {
      title: t("checkout.summary.title"),
      lines: summaryLines,
      totalLabel: t("checkout.summary.total"),
      total: formatIdr(order.totalIdr),
      footnote: t("payment.summary.footnote", { count: order.items.length }),
    },
    pay: payButtonConfig,
    terms: termsText,
  };
};
