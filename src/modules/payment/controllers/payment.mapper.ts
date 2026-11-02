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
import type {
  AvailableMethod,
  BankCode,
  Order,
  PaymentInstruction,
  PaymentMethod,
} from "../domain/order.model";
import type { PaymentResultViewProps } from "../views/PaymentResultView";
import type { PaymentInstructionView, PaymentMethodOption, PaymentViewProps } from "../views/PaymentView";

// Method display info
const METHOD_LABELS: Record<PaymentMethod, MessageKey> = {
  bank_transfer: "payment.method.bank_transfer",
  gopay: "payment.method.gopay",
};

type Common = { order: Order; remainingMs: number };

export type PaymentViewInput = Common & {
  availableMethods: AvailableMethod[];
  selectedMethod: PaymentMethod | null;
  selectedBank: BankCode | null;
  paying: boolean;
  copied: boolean;
  onSelectMethod: (method: PaymentMethod) => void;
  onSelectBank: (bank: BankCode) => void;
  onPay: () => void;
  onCopy: (text: string) => void;
  onRetry?: () => void;
};

function toInstructionView(
  instruction: PaymentInstruction,
  copied: boolean,
  onCopy: (text: string) => void,
): PaymentInstructionView {
  switch (instruction.type) {
    case "bank_transfer":
      return {
        type: "bank_transfer",
        label: t("payment.va.label", { bank: instruction.bank.toUpperCase() }),
        vaNumber: instruction.vaNumber,
        copy: {
          label: copied ? t("payment.va.copied") : t("payment.va.copy"),
          onClick: () => onCopy(instruction.vaNumber),
        },
      };
    case "gopay":
      return {
        type: "gopay",
        qrUrl: instruction.qrUrl,
        deeplinkUrl: instruction.deeplinkUrl,
        qrLabel: t("payment.qr.label"),
        hint: t("payment.qr.hint"),
      };
  }
}

function toMethodOptions(
  methods: AvailableMethod[],
  selectedMethod: PaymentMethod | null,
  selectedBank: BankCode | null,
  onSelectMethod: (method: PaymentMethod) => void,
  onSelectBank: (bank: BankCode) => void,
): PaymentMethodOption[] {
  return methods.map((method) => ({
    id: method.id,
    label: t(METHOD_LABELS[method.id]),
    description: method.description,
    iconUrl: method.iconUrl,
    enabled: method.enabled,
    selected: selectedMethod === method.id,
    onSelect: () => onSelectMethod(method.id),
    banks: method.banks?.map((bank) => ({
      code: bank.code,
      name: bank.name,
      iconUrl: bank.iconUrl,
      selected: selectedBank === bank.code,
      onSelect: () => onSelectBank(bank.code),
    })),
  }));
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
          options: toMethodOptions(
            input.availableMethods,
            input.selectedMethod,
            input.selectedBank,
            input.onSelectMethod,
            input.onSelectBank,
          ),
        },
    pay: showInstruction
      ? undefined
      : {
          label: input.paying ? t("payment.paying") : t("payment.pay"),
          disabled:
            input.paying ||
            remainingMs <= 0 ||
            !input.selectedMethod ||
            (input.selectedMethod === "bank_transfer" && !input.selectedBank),
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
    retry: input.onRetry
      ? {
          label: t("payment.retry"),
          onClick: input.onRetry,
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
