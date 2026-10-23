import { canAddTicketToSession, canSubmitBooking, formatMmSs, selectedCount, totalPriceIdr, type AppError } from "@rusuh/core";
import { t, type MessageKey } from "@rusuh/i18n";
import type { BookingViewProps, StatusViewProps } from "@rusuh/ui";
import { formatIdr } from "../shared/format";
import type { BookingScreenState } from "./bookingModel";
import type { BookingViewModel } from "./useBookingViewModel";

const URGENT_AT_MS = 60_000;

export type BookingView = { kind: "ready"; view: BookingViewProps } | { kind: "status"; view: StatusViewProps };

function errorKey(error: AppError): MessageKey {
  if (error.kind === "network") return "booking.error.network";
  if (error.kind === "api" && error.code === "ACCESS_EXPIRED") return "booking.error.ACCESS_EXPIRED";
  if (error.kind === "api" && error.code === "QUEUE_TOKEN_INVALID") return "booking.error.QUEUE_TOKEN_INVALID";
  return "booking.error.unknown";
}

function toSelectingViewProps(
  { session, selection, remainingMs }: Extract<BookingScreenState, { kind: "selecting" }>,
  actions: BookingViewModel["actions"],
): BookingViewProps {
  const count = selectedCount(selection);
  const time = formatMmSs(remainingMs);
  const quotaLeft = Math.max(0, session.quota.max - session.quota.used - count);

  return {
    eventName: session.eventName,
    headerTimerLabel: t("booking.header.timer", { time }),
    countdown: {
      heading: t("booking.countdown.heading"),
      value: time,
      hint: t("booking.countdown.hint"),
      urgent: remainingMs <= URGENT_AT_MS,
      urgentMessage: t("booking.countdown.urgent"),
    },
    nik: { label: t("booking.nik.label"), maskedValue: session.maskedNik, hint: t("booking.nik.hint", { remaining: quotaLeft, max: session.quota.max }) },
    categoriesLabel: t("booking.categories.label"),
    quotaNotice: session.quota.remaining <= 0 ? t("booking.quota.exhausted") : undefined,
    categories: session.categories.map((category) => {
      const quantity = selection[category.id] ?? 0;
      const soldOut = category.stock <= 0;
      return {
        id: category.id,
        name: category.name,
        priceLabel: formatIdr(category.priceIdr),
        stockLabel: soldOut ? t("booking.category.soldOut") : t("booking.category.stock", { count: category.stock }),
        soldOut,
        quantity,
        canAdd: canAddTicketToSession(session, selection, category.id),
        canRemove: quantity > 0,
        addLabel: t("booking.category.add", { name: category.name }),
        removeLabel: t("booking.category.remove", { name: category.name }),
        onAdd: () => actions.add(category.id),
        onRemove: () => actions.remove(category.id),
      };
    }),
    total: { label: t("booking.total", { count }), value: formatIdr(totalPriceIdr(selection, session.categories)) },
    submit: { label: t("booking.submit"), disabled: !canSubmitBooking(selection, remainingMs), onClick: actions.submit },
  };
}

export function toBookingViewProps({ state, actions }: BookingViewModel): BookingView {
  switch (state.kind) {
    case "loading":
      return { kind: "status", view: { title: t("booking.title"), message: t("booking.loading"), tone: "neutral" } };
    case "failed":
      return { kind: "status", view: { title: t("booking.error.title"), message: t(errorKey(state.error)), tone: "error" } };
    case "expired":
      if (state.next === "redirect") {
        return { kind: "status", view: { title: t("booking.expired.title"), message: t("booking.expired.redirecting"), tone: "neutral" } };
      }
      return {
        kind: "status",
        view: {
          title: t("booking.expired.title"),
          message: t("booking.error.ACCESS_EXPIRED"),
          tone: "error",
          action: { label: t("booking.expired.cta"), onClick: actions.backToQueue },
        },
      };
    case "selecting":
      return { kind: "ready", view: toSelectingViewProps(state, actions) };
  }
}
