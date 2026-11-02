/**
 * Payment Mapper - API Contracts v2.1
 *
 * Requirements: 6.1-6.19
 * Maps Order domain models to PaymentView props
 */

import { COUNTDOWN_URGENT_AT_MS } from "@/core/domain/time/countdown.constants";
import { formatMmSs } from "@/core/domain/time/format-mm-ss.utils";
import { formatIdr } from "@/core/controllers/format-currency.utils";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { Order, PaymentInstruction, PaymentMethod } from "../domain/order.model";
import type { PaymentResultViewProps } from "../views/PaymentResultView";
import type { PaymentInstructionView, PaymentViewProps } from "../views/PaymentView";

/** i18n keys per metode pembayaran */
const METHOD_LABELS: Record<PaymentMethod, MessageKey> = {
  bank_transfer: "payment.method.bank_transfer",
  gopay: "payment.method.gopay",
};

export type PaymentViewInput = {
  order: Order;
  remainingMs: number;
  selectedMethod: PaymentMethod;
  paying: boolean;
  copied: boolean;
  onSelectMethod: (method: PaymentMethod) => void;
  onPay: () => void;
  onCopy: (text: string) => void;
  /** Hanya mode mock: kontrol simulasi Midtrans. */
  mock?: {
    onSuccess: () => void;
    onFail: () => void;
    busy: boolean;
  };
};

function toInstructionView(
  instruction: PaymentInstruction,
  copied: boolean,
  onCopy: (text: string) => void,
): PaymentInstructionView {
  switch (instruction.type) {
    case "bank_transfer":
      return {
        type: "virtual_account",
        label: t("payment.va.label", { bank: instruction.bank.toUpperCase() }),
        number: instruction.vaNumber,
        copy: {
          label: copied ? t("payment.va.copied") : t("payment.va.copy"),
          onClick: () => onCopy(instruction.vaNumber),
        },
      };
    case "gopay":
      return {
        type: "qr",
        seed: instruction.qrUrl,
        qrLabel: t("payment.qr.label"),
        hint: t("payment.qr.hint"),
        fakeNote: t("payment.qr.fake"),
      };
  }
}

/** Tahap pilih metode (wireframe 9.4) dan tahap menunggu pembayaran. */
export function toPaymentViewProps(input: PaymentViewInput): PaymentViewProps {
  const { order, remainingMs } = input;
  const time = formatMmSs(remainingMs);
  const isAwaitingPayment = order.status === "AWAITING_PAYMENT" || order.status === "PENDING_CANCELLATION";
  const showInstruction = isAwaitingPayment && order.instruction;

  return {
    title: t("payment.title"),
    orderLabel: t("payment.header.order", { orderId: order.bookingId }),
    countdown: {
      heading: t("payment.countdown.heading"),
      value: time,
      hint: t("payment.countdown.hint"),
      urgent: remainingMs <= COUNTDOWN_URGENT_AT_MS,
      urgentMessage: t("payment.countdown.urgent"),
    },
    total: { label: t("payment.total"), value: formatIdr(order.totalIdr) },
    methods: showInstruction
      ? undefined
      : {
          label: t("payment.method.label"),
          options: (["bank_transfer", "gopay"] as const).map((id) => ({
            id,
            label: t(METHOD_LABELS[id]),
            selected: input.selectedMethod === id,
            onSelect: () => input.onSelectMethod(id),
          })),
        },
    pay: showInstruction
      ? undefined
      : {
          label: input.paying ? t("payment.paying") : t("payment.pay"),
          disabled: input.paying || remainingMs <= 0,
          onClick: input.onPay,
        },
    pending:
      showInstruction && order.instruction
        ? {
            heading: t("payment.pending.heading"),
            note: t("payment.pending.note"),
            instruction: toInstructionView(order.instruction, input.copied, input.onCopy),
          }
        : undefined,
    mockControls: input.mock
      ? {
          title: t("payment.mock.title"),
          success: {
            label: t("payment.mock.success"),
            onClick: input.mock.onSuccess,
            disabled: input.mock.busy,
          },
          fail: { label: t("payment.mock.fail"), onClick: input.mock.onFail, disabled: input.mock.busy },
        }
      : undefined,
  };
}

/** Status akhir (wireframe 9.5). */
export function toPaymentResultProps(
  order: Order,
  onOpenTicket: () => void,
  onHome: () => void,
): PaymentResultViewProps {
  const orderLabel = t("payment.header.order", { orderId: order.bookingId });

  if (order.status === "PAID") {
    const quantity = order.items.length;
    return {
      tone: "success",
      headerLabel: t("payment.result.paid.header"),
      orderLabel,
      title: t("payment.result.paid.title"),
      message: t("payment.result.paid.message"),
      ticket: t("payment.result.paid.ticket", {
        quantity,
        names: order.items.map((item) => item.category).join(", "),
      }),
      cta: { label: t("payment.result.paid.cta"), onClick: onOpenTicket },
    };
  }

  const kind = order.status === "EXPIRED" ? "expired" : "failed";
  return {
    tone: "danger",
    headerLabel: t(`payment.result.${kind}.header` as MessageKey),
    orderLabel,
    title: t(`payment.result.${kind}.title` as MessageKey),
    message: t(`payment.result.${kind}.message` as MessageKey),
    cta: { label: t("payment.result.home"), onClick: onHome },
  };
}
