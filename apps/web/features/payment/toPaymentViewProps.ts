import { formatMmSs, type AppError, type Order, type PaymentInstruction, type PaymentMethod } from "@rusuh/core";
import { t, type MessageKey } from "@rusuh/i18n";
import type { PaymentInstructionView, PaymentResultViewProps, PaymentViewProps, StatusViewProps } from "@rusuh/ui";
import { formatIdr } from "../shared/format";
import type { PaymentScreenState } from "./paymentModel";
import type { PaymentViewModel } from "./usePaymentViewModel";

const URGENT_AT_MS = 60_000;
const METHODS: PaymentMethod[] = ["virtual_account", "e_wallet", "bank_transfer"];

type Actions = PaymentViewModel["actions"];

export type PaymentView =
  | { kind: "payment"; view: PaymentViewProps }
  | { kind: "result"; view: PaymentResultViewProps }
  | { kind: "status"; view: StatusViewProps };

function errorKey(error: AppError): MessageKey {
  return error.kind === "network" ? "payment.error.network" : "payment.error.unknown";
}

function toInstructionView(instruction: PaymentInstruction, copied: boolean, onCopy: (text: string) => void): PaymentInstructionView {
  switch (instruction.type) {
    case "virtual_account":
      return {
        type: "virtual_account",
        label: t("payment.va.label", { bank: instruction.bank }),
        number: instruction.number,
        copy: { label: copied ? t("payment.va.copied") : t("payment.va.copy"), onClick: () => onCopy(instruction.number) },
      };
    case "qr":
      return {
        type: "qr",
        seed: instruction.payload,
        qrLabel: t("payment.qr.label"),
        hint: t("payment.qr.hint"),
        fakeNote: t("payment.qr.fake"),
      };
    case "bank_transfer":
      return {
        type: "bank_transfer",
        lines: [
          t("payment.transfer.bank", { bank: instruction.bank }),
          t("payment.transfer.account", { account: instruction.account }),
          t("payment.transfer.name", { name: instruction.accountName }),
        ],
      };
  }
}

/** Tahap pilih metode (wireframe 9.4) dan tahap menunggu pembayaran. */
function toPayingViewProps(state: Extract<PaymentScreenState, { kind: "paying" }>, actions: Actions): PaymentViewProps {
  const { order, remainingMs } = state;
  const time = formatMmSs(remainingMs);
  const instruction = order.status === "pending" ? order.instruction : undefined;

  return {
    title: t("payment.title"),
    orderLabel: t("payment.header.order", { orderId: order.orderId }),
    countdown: {
      heading: t("payment.countdown.heading"),
      value: time,
      hint: t("payment.countdown.hint"),
      urgent: remainingMs <= URGENT_AT_MS,
      urgentMessage: t("payment.countdown.urgent"),
    },
    total: { label: t("payment.total"), value: formatIdr(order.totalIdr) },
    methods: instruction
      ? undefined
      : {
          label: t("payment.method.label"),
          options: METHODS.map((method) => ({
            id: method,
            label: t(`payment.method.${method}`),
            selected: state.method === method,
            onSelect: () => actions.selectMethod(method),
          })),
        },
    pay: instruction
      ? undefined
      : { label: state.submitting ? t("payment.paying") : t("payment.pay"), disabled: state.submitting || remainingMs <= 0, onClick: actions.pay },
    pending: instruction
      ? {
          heading: t("payment.pending.heading"),
          note: t("payment.pending.note"),
          instruction: toInstructionView(instruction, state.copied, actions.copy),
        }
      : undefined,
    mockControls:
      instruction && state.simulation
        ? {
            title: t("payment.mock.title"),
            success: { label: t("payment.mock.success"), onClick: () => actions.simulate("success"), disabled: state.simulation.busy },
            fail: { label: t("payment.mock.fail"), onClick: () => actions.simulate("fail"), disabled: state.simulation.busy },
          }
        : undefined,
  };
}

/** Status akhir (wireframe 9.5). */
function toResultViewProps(order: Order, actions: Actions): PaymentResultViewProps {
  const orderLabel = t("payment.header.order", { orderId: order.orderId });
  if (order.status === "paid") {
    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      tone: "success",
      headerLabel: t("payment.result.paid.header"),
      orderLabel,
      title: t("payment.result.paid.title"),
      message: t("payment.result.paid.message"),
      ticket: t("payment.result.paid.ticket", { quantity, names: order.items.map((item) => item.name).join(", ") }),
      cta: { label: t("payment.result.paid.cta"), onClick: actions.openTicket },
    };
  }
  const kind = order.status === "expired" ? "expired" : "failed";
  return {
    tone: "danger",
    headerLabel: t(`payment.result.${kind}.header`),
    orderLabel,
    title: t(`payment.result.${kind}.title`),
    message: t(`payment.result.${kind}.message`),
    cta: { label: t("payment.result.home"), onClick: actions.goHome },
  };
}

export function toPaymentViewProps({ state, actions }: PaymentViewModel): PaymentView {
  switch (state.kind) {
    case "loading":
      return { kind: "status", view: { title: t("payment.title"), message: t("payment.loading"), tone: "neutral" } };
    case "failed":
      return { kind: "status", view: { title: t("payment.error.title"), message: t(errorKey(state.error)), tone: "error" } };
    case "settled":
      return { kind: "result", view: toResultViewProps(state.order, actions) };
    case "paying":
      return { kind: "payment", view: toPayingViewProps(state, actions) };
  }
}
