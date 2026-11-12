import type { AppError } from "@/core/domain/app-error";
import { t } from "@/core/i18n/t.utils";
import type { SiteChrome } from "@/core/controllers/site-chrome.utils";
import { QUEUE_GONE_REDIRECT_SECONDS } from "../domain/queue.constants";
import { queueProgressPercent } from "../domain/queue-progress.rules";
import { queueWaitEstimate, type QueueWaitEstimate } from "../domain/queue-wait.rules";
import type { QueueEvent } from "../domain/queue-event.model";
import type { QueueState } from "../domain/queue-state.model";
import type { QueueEventCardProps, QueueStatusProps, QueueViewProps } from "../views/QueueView";

const number = new Intl.NumberFormat("id-ID");
const eventDate = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });

/** Teks estimasi tunggu (kontrak §3.5). Jam memakai koma desimal, mis. "± 1,5 jam". */
function waitText(estimate: QueueWaitEstimate): string {
  switch (estimate.kind) {
    case "soon":
      return t("queue.eta.soon");
    case "calculating":
      return t("queue.eta.calculating");
    case "minutes":
      return t("queue.eta.value", { minutes: estimate.minutes });
    case "hours":
      return t("queue.eta.hours", { hours: number.format(estimate.hours) });
    case "long":
      return t("queue.eta.long", { hours: number.format(estimate.hours) });
  }
}

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
    // Stok sedang habis: estimasi tidak bermakna sampai kursi kembali.
    eta: state.fullBooked
      ? undefined
      : {
          label: t("queue.eta.label"),
          value: waitText(queueWaitEstimate(state.position, state.ratePerMin)),
        },
    notice: state.fullBooked ? t("queue.fullBooked") : undefined,
    stale: state.stale,
    progress: { percent, label: t("queue.progress.label", { percent }) },
    updatedNote: state.stale ? t("queue.stale") : t("queue.updated"),
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
  dialog?: QueueViewProps["dialog"];
};

/** Halaman Waiting Room: breadcrumb, judul, panel status, kartu event, dan tips. */
export function toQueueViewProps({
  chrome,
  eventName,
  event,
  status,
  dialog,
}: QueuePageInput): QueueViewProps {
  return {
    ...chrome,
    dialog,
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

/** Antrian tidak bisa dilanjutkan dan customer dikembalikan ke beranda: tiket habis atau penjualan/antrian berakhir. */
export type QueueGone =
  { cause: "sold-out" } | { cause: "ended"; reason: Extract<QueueState, { status: "ended" }>["reason"] };

/**
 * Kapan modal "habis/berakhir" tampil: join ditolak FULL_BOOKED/SALE_CLOSED (tanpa data antrian) atau antrian
 * sudah berstatus ended. QUEUE_FULL bukan di sini: customer masih boleh mencoba lagi.
 */
export function toQueueGone(
  data: QueueState | undefined,
  failure: AppError | undefined,
): QueueGone | undefined {
  if (data?.status === "ended") return { cause: "ended", reason: data.reason };
  if (data) return undefined;
  if (failure?.kind === "api" && (failure.code === "FULL_BOOKED" || failure.code === "SALE_CLOSED")) {
    return { cause: "sold-out" };
  }
  return undefined;
}

function goneTitle(gone: QueueGone): string {
  if (gone.cause === "sold-out") return t("queue.gone.soldOut.title");
  if (gone.reason === "closed") return t("queue.gone.closed.title");
  return t("queue.gone.ended.title");
}

function goneDescription(gone: QueueGone): string {
  return gone.cause === "sold-out" ? t("queue.gone.soldOut.description") : t(`queue.ended.${gone.reason}`);
}

/** Modal tiket habis/penjualan berakhir dengan hitung mundur ke beranda (`seconds` kosong: belum mulai menghitung). */
export function toQueueGoneDialog({
  gone,
  seconds,
  onGoHome,
}: {
  gone: QueueGone;
  seconds: number | null;
  onGoHome: () => void;
}): NonNullable<QueueViewProps["dialog"]> {
  return {
    tone: "warning",
    illustration: "box",
    title: goneTitle(gone),
    description: goneDescription(gone),
    note: t("queue.gone.redirect", { seconds: seconds ?? QUEUE_GONE_REDIRECT_SECONDS }),
    primary: { label: t("queue.gone.home"), onClick: onGoHome },
    onDismiss: onGoHome,
  };
}
