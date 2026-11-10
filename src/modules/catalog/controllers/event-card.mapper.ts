import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { Event, EventStatus } from "../domain/event.model";
import type { EventCardProps } from "../views/EventCard";

const statusTone: Record<EventStatus, EventCardProps["statusTone"]> = {
  AVAILABLE: "success",
  SELLING_OUT_FAST: "info",
  SOLD_OUT: "danger",
};

/** Chip yang diturunkan dari kondisi tombol menang atas nada status stok. */
const badgeTone: Record<string, EventCardProps["statusTone"]> = {
  "home.event.badge.queueFull": "warning",
  "home.event.badge.fullBooked": "warning",
  "home.event.badge.notOpen": "info",
  "home.event.status.SOLD_OUT": "danger",
  "home.event.status.SELLING_OUT_FAST": "info",
};

const opensAtFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Jakarta",
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

/** Belum dibuka: "Buka 10 Nov 09:00" (waktu absolut, kontrak §2.1); tanpa jadwal jatuh ke label umum. */
function disabledLabel(display: Event["display"], saleStartsAt?: string): string {
  if (display.labelKey === "home.event.notOpen" && saleStartsAt) {
    const when = new Date(saleStartsAt);
    if (!Number.isNaN(when.getTime())) {
      return t("home.event.opensAt", {
        when: opensAtFormatter.format(when).replace(",", "").replace(".", ":"),
      });
    }
  }
  return t(display.labelKey as MessageKey);
}

function resolveCta(
  eventId: string,
  display: Event["display"],
  saleStartsAt?: string,
): EventCardProps["cta"] {
  if (!display.enabled || display.action === "disabled") {
    return { label: disabledLabel(display, saleStartsAt) };
  }
  const href = display.action === "queue" ? `/events/${eventId}/queue` : `/events/${eventId}/book`;
  return { label: t(display.labelKey as MessageKey), href };
}

export function toEventCardProps(event: Event): EventCardProps {
  const { id, name, date, venue, status, display, imageUrl, category, saleStartsAt } = event;
  const statusLabelKey = display.badgeKey
    ? (display.badgeKey as MessageKey)
    : (`home.event.status.${status}` as MessageKey);

  return {
    id,
    name,
    imageUrl: imageUrl || "/images/concert-placeholder.webp",
    location: venue.split(",")[0]?.trim() || "JAKARTA",
    category,
    date: dateFormatter.format(new Date(date)),
    venue,
    statusLabel: t(statusLabelKey),
    statusTone: (display.badgeKey && badgeTone[display.badgeKey]) || statusTone[status],
    cta: resolveCta(id, display, saleStartsAt),
  };
}
