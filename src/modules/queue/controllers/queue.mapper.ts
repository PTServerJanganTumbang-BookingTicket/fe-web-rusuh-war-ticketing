import { t } from "@/core/i18n/t.utils";
import type { SiteChrome } from "@/core/controllers/site-chrome.utils";
import { queueProgressPercent } from "../domain/queue-progress.rules";
import type { QueueEvent } from "../domain/queue-event.model";
import type { QueueState } from "../domain/queue-state.model";
import type { QueueEventCardProps, QueueStatusProps, QueueViewProps } from "../views/QueueView";

const number = new Intl.NumberFormat("id-ID");
const eventDate = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });

/** Panel status saat menunggu (desain Waiting Room). State lain dibangun controller. */
export function toWaitingStatus(state: Extract<QueueState, { status: "waiting" }>): QueueStatusProps {
  const percent = queueProgressPercent(state.joinedPosition, state.position);
  return {
    state: "waiting",
    badge: { label: t("queue.badge.waiting"), tone: "success" },
    position: {
      label: t("queue.position.label"),
      value: t("queue.position.value", { position: number.format(state.position) }),
      suffix: t("queue.position.suffix"),
    },
    eta: {
      label: t("queue.eta.label"),
      value: t("queue.eta.value", { minutes: Math.max(1, Math.ceil(state.etaSeconds / 60)) }),
    },
    progress: { percent, label: t("queue.progress.label", { percent }) },
    updatedNote: t("queue.updated"),
    note: t("queue.note"),
  };
}

export function toEventCard(event: QueueEvent): QueueEventCardProps {
  return {
    imageUrl: event.imageUrl,
    tag: t("queue.event.tag", { category: event.category, city: event.city }),
    name: t("queue.event.name", { name: event.name, city: event.city }),
    date: eventDate.format(new Date(event.date)),
    venue: `${event.venue}, ${event.city}`,
  };
}

export type QueuePageInput = {
  chrome: SiteChrome;
  /** Nama event dari detail event atau dari tiket antrian, mana yang lebih dulu ada. */
  eventName?: string;
  event?: QueueEvent;
  status: QueueStatusProps;
};

/** Halaman Waiting Room: breadcrumb, judul, panel status, kartu event, dan tips. */
export function toQueueViewProps({ chrome, eventName, event, status }: QueuePageInput): QueueViewProps {
  return {
    ...chrome,
    breadcrumb: [
      { label: t("queue.breadcrumb.home"), href: "/" },
      ...(eventName ? [{ label: eventName }] : []),
      { label: t("queue.breadcrumb.current") },
    ],
    heading: t("queue.heading"),
    subtitle: eventName ? t("queue.subtitle", { event: eventName }) : t("queue.subtitle.loading"),
    status,
    event: event ? toEventCard(event) : undefined,
    tips: {
      title: t("queue.tips.title"),
      items: [
        { icon: "nik", text: t("queue.tips.nik") },
        { icon: "tickets", text: t("queue.tips.tickets") },
        { icon: "connection", text: t("queue.tips.connection") },
      ],
    },
  };
}
