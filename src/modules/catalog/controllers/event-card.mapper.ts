import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { Event, EventStatus } from "../domain/event.model";
import type { EventCardProps } from "../views/EventCard";

const statusTone: Record<EventStatus, EventCardProps["statusTone"]> = {
  AVAILABLE: "success",
  SELLING_OUT_FAST: "info",
  SOLD_OUT: "danger",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

function resolveCta(eventId: string, display: Event["display"]): EventCardProps["cta"] {
  if (!display.enabled || display.action === "disabled") {
    return { label: t(display.labelKey as MessageKey) };
  }
  const href = display.action === "queue" ? `/events/${eventId}/queue` : `/events/${eventId}/book`;
  return { label: t(display.labelKey as MessageKey), href };
}

export function toEventCardProps(event: Event): EventCardProps {
  const { id, name, date, venue, status, display, imageUrl } = event;
  const statusLabelKey = display.badgeKey
    ? (display.badgeKey as MessageKey)
    : (`home.event.status.${status}` as MessageKey);

  return {
    id,
    name,
    imageUrl: imageUrl || "/images/placeholder-event.jpg",
    location: venue.split(",")[0]?.trim() || "JAKARTA",
    category: "LIVE MUSIC",
    date: dateFormatter.format(new Date(date)),
    venue,
    statusLabel: t(statusLabelKey),
    statusTone: statusTone[status],
    cta: resolveCta(id, display),
  };
}
