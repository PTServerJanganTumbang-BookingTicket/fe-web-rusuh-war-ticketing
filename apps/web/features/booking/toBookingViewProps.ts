import { canAddTicket, formatMmSs, selectedCount, totalPriceIdr, type BookingSession, type Selection } from "@rusuh/core";
import { t } from "@rusuh/i18n";
import type { BookingViewProps } from "@rusuh/ui";
import { formatIdr } from "../shared/format";

const URGENT_AT_MS = 60_000;

export type BookingViewInput = {
  session: BookingSession;
  selection: Selection;
  remainingMs: number;
  onAdd: (categoryId: string) => void;
  onRemove: (categoryId: string) => void;
  onSubmit: () => void;
};

export function toBookingViewProps({ session, selection, remainingMs, onAdd, onRemove, onSubmit }: BookingViewInput): BookingViewProps {
  const count = selectedCount(selection);
  const stock = Object.fromEntries(session.categories.map((category) => [category.id, category.stock]));
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
        canAdd: canAddTicket({ categoryId: category.id, selection, stock, activeBooked: session.quota.used }),
        canRemove: quantity > 0,
        addLabel: t("booking.category.add", { name: category.name }),
        removeLabel: t("booking.category.remove", { name: category.name }),
        onAdd: () => onAdd(category.id),
        onRemove: () => onRemove(category.id),
      };
    }),
    total: { label: t("booking.total", { count }), value: formatIdr(totalPriceIdr(selection, session.categories)) },
    submit: { label: t("booking.submit"), disabled: count === 0 || remainingMs <= 0, onClick: onSubmit },
  };
}
