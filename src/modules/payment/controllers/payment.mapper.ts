/**
 * Payment mapper. Desain: "Satu langkah menuju panggung." (langkah 2 dari 3), lalu status akhir di langkah 3.
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
  PaymentInstruction,
  PaymentMethod,
} from "../domain/order.model";
import type { PaymentEvent } from "../domain/payment-event.model";
import type { PaymentInstructionView, PaymentStage, PaymentViewProps } from "../views/PaymentView";

const eventDate = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export type PaymentViewInput = {
  chrome: SiteChrome;
  order: Order;
  event?: PaymentEvent;
  methods: AvailableMethod[];
  selectedMethod: PaymentMethod | null;
  selectedBank: BankCode | null;
  /** Bank wajib untuk Virtual Account; galat tampil setelah tombol bayar ditekan. */
  bankMissing: boolean;
  remainingMs: number;
  paying: boolean;
  copied: boolean;
  error?: string;
  onSelectMethod: (method: PaymentMethod) => void;
  onSelectBank: (bank: BankCode) => void;
  onPay: () => void;
  onCopy: (text: string) => void;
  /** Hanya mode mock: kontrol hasil pembayaran. */
  mock?: { onSuccess: () => void; onFail: () => void; busy: boolean };
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
        hint: t("payment.pending.qr"),
        fakeNote: t("payment.qr.fake"),
        openApp: { label: t("payment.pending.openApp"), href: instruction.deeplinkUrl },
      };
  }
}

function orderStatus(order: Order): PaymentViewProps["order"]["status"] {
  if (order.status === "PAID") return { label: t("payment.status.paid"), tone: "success" };
  if (order.status === "FAILED") return { label: t("payment.status.failed"), tone: "error" };
  if (order.status === "EXPIRED") return { label: t("payment.status.expired"), tone: "error" };
  return { label: t("payment.status.awaiting"), tone: "warning" };
}

function resultStage(order: Order): PaymentStage {
  if (order.status === "PAID") {
    return {
      kind: "result",
      tone: "success",
      title: t("payment.result.paid.title"),
      message: t("payment.result.paid.message"),
      detail: t("payment.result.paid.ticket", {
        quantity: order.items.length,
        names: [...new Set(order.items.map((item) => item.category))].join(", "),
      }),
      primary: { label: t("payment.result.paid.cta"), href: "/tickets" },
      secondary: { label: t("payment.result.paid.secondary"), href: "/" },
    };
  }
  return {
    kind: "result",
    tone: "warning",
    title: t("payment.result.expired.title"),
    message: t("payment.result.expired.message"),
    primary: { label: t("payment.result.home"), href: "/" },
  };
}

function selectStage(input: PaymentViewInput): PaymentStage {
  const { methods, selectedMethod, selectedBank } = input;
  const vaBanks = methods.find((method) => method.id === "bank_transfer")?.banks ?? [];
  return {
    kind: "select",
    title: t("payment.method.label"),
    failedNotice: input.order.status === "FAILED" ? t("payment.failedNotice") : undefined,
    methods: methods.map((method) => ({
      id: method.id,
      icon: method.id === "gopay" ? "wallet" : "bank",
      title: t(`payment.option.${method.id}.title`),
      description: method.enabled
        ? t(`payment.option.${method.id}.description`)
        : t("payment.option.unavailable"),
      selected: selectedMethod === method.id,
      disabled: !method.enabled,
      onSelect: () => input.onSelectMethod(method.id),
    })),
    banks:
      selectedMethod === "bank_transfer" && vaBanks.length > 0
        ? {
            label: t("payment.bank.label"),
            error: input.bankMissing ? t("payment.bank.required") : undefined,
            options: vaBanks.map((bank) => ({
              code: bank.code,
              name: bank.name,
              selected: selectedBank === bank.code,
              onSelect: () => input.onSelectBank(bank.code),
            })),
          }
        : undefined,
    note: selectedMethod ? t(`payment.option.${selectedMethod}.note`) : undefined,
  };
}

function stageOf(input: PaymentViewInput): PaymentStage {
  const { order } = input;
  if (order.status === "PAID" || order.status === "EXPIRED") return resultStage(order);
  const awaiting = order.status === "AWAITING_PAYMENT" || order.status === "PENDING_CANCELLATION";
  if (awaiting && order.instruction) {
    return {
      kind: "pending",
      title: t("payment.pending.heading"),
      note: t("payment.pending.note"),
      instruction: toInstructionView(order.instruction, input.copied, input.onCopy),
      mock: input.mock
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
  // Belum memilih, instruksi hilang setelah muat ulang, atau gagal dan bisa dicoba lagi: pilih metode.
  return selectStage(input);
}

export function toPaymentViewProps(input: PaymentViewInput): PaymentViewProps {
  const { order, event, remainingMs } = input;
  const stage = stageOf(input);
  const finished = order.status === "PAID";
  const eventTitle = event
    ? t("checkout.event.name", { name: event.name, city: event.city })
    : order.eventName;

  const byCategory = new Map<string, { count: number; priceIdr: number }>();
  for (const item of order.items) {
    const line = byCategory.get(item.category) ?? { count: 0, priceIdr: item.priceIdr };
    byCategory.set(item.category, { ...line, count: line.count + 1 });
  }

  return {
    ...input.chrome,
    header: {
      breadcrumb: [
        { label: t("checkout.breadcrumb.home"), href: "/" },
        { label: event?.name ?? order.eventName },
        { label: t("payment.title") },
      ],
      steps: [
        { label: t("checkout.step.select"), state: "done" },
        { label: t("checkout.step.payment"), state: finished ? "done" : "current" },
        { label: t("checkout.step.done"), state: finished ? "current" : "upcoming" },
      ],
      heading: t("payment.heading"),
      subtitle: t(
        stage.kind === "result"
          ? `payment.result.${finished ? "paid" : "expired"}.subtitle`
          : "payment.subtitle",
      ),
    },
    order: { label: t("payment.header.order", { orderId: order.bookingId }), status: orderStatus(order) },
    // Pembayaran gagal masih bisa dicoba ulang selama TTL booking berjalan (BR-06), jadi timer tetap tampil.
    countdown:
      finished || order.status === "EXPIRED"
        ? undefined
        : {
            title: t("payment.countdown.heading"),
            hint: t("payment.countdown.hint"),
            value: formatMmSs(remainingMs),
            urgent: remainingMs <= COUNTDOWN_URGENT_AT_MS,
            urgentLabel: t("payment.countdown.urgent"),
          },
    error: input.error,
    stage,
    secure: { title: t("payment.secure.title"), body: t("payment.secure.body") },
    event: event
      ? {
          imageUrl: event.imageUrl,
          tag: t("checkout.event.tag", { category: event.category, city: event.city }),
          name: eventTitle,
          date: eventDate.format(new Date(event.date)),
          venue: `${event.venue}, ${event.city}`,
        }
      : undefined,
    summary: {
      title: t("checkout.summary.title"),
      lines: [...byCategory].map(([category, line]) => ({
        label: t("checkout.summary.line", { category, count: line.count }),
        detail: t("checkout.summary.each", { price: formatIdr(line.priceIdr) }),
        amount: formatIdr(line.priceIdr * line.count),
      })),
      totalLabel: t("checkout.summary.total"),
      total: formatIdr(order.totalIdr),
      footnote: t("payment.summary.footnote", { count: order.items.length }),
    },
    pay:
      stage.kind === "select"
        ? {
            label: input.paying ? t("payment.paying") : t("payment.pay"),
            busy: input.paying,
            disabled: input.paying || !input.selectedMethod || remainingMs <= 0,
            onClick: input.onPay,
          }
        : undefined,
    terms: stage.kind === "select" ? t("payment.terms") : undefined,
  };
}
