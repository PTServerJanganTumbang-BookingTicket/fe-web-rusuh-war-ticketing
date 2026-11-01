import { t } from "@/core/i18n/t.utils";
import type { Event, EventStatus } from "../domain/event.model";
import type { EventCardProps } from "../views/EventCard";

const tone: Record<EventStatus, EventCardProps["statusTone"]> = {
  upcoming: "info",
  on_sale: "success",
  sold_out: "danger",
};

// "25 Des 2026"
const date = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

export function toEventCardProps(event: Event): EventCardProps {
  const available = event.status === "on_sale";
  return {
    id: event.id,
    name: event.name,
    meta: `${date.format(new Date(event.startsAt))} · ${event.venue}`,
    statusLabel: t(`home.event.status.${event.status}`),
    statusTone: tone[event.status],
    cta: available
      ? { label: t("home.event.cta"), href: `/events/${event.id}/queue` }
      : { label: t("home.event.unavailable") },
  };
}
