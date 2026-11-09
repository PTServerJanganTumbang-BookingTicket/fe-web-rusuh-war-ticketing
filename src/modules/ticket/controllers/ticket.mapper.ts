import type { TicketSummary, ETicket, TicketStatus } from "../domain/ticket.model";
import type { TicketCardProps } from "../views/TicketCard";
import type { ETicketViewProps } from "../views/ETicketView";
import type { SiteChrome } from "@/core/controllers/site-chrome.utils";
import { intlLocale } from "@/core/i18n/locale.utils";
import { t, type MessageKey } from "@/core/i18n/t.utils";

const statusTone: Record<TicketStatus, { key: MessageKey; tone: TicketCardProps["statusTone"] }> = {
  ISSUED: { key: "ticket.status.ISSUED", tone: "success" },
  USED: { key: "ticket.status.USED", tone: "info" },
  CANCELLED: { key: "ticket.status.CANCELLED", tone: "danger" },
  EXPIRED: { key: "ticket.status.EXPIRED", tone: "warning" },
};

function statusOf(status: TicketStatus) {
  const { key, tone } = statusTone[status];
  return { label: t(key), tone };
}

// Nama hari dan bulan mengikuti bahasa aktif; zona waktu tetap WIB (lokasi venue).
const dateFormatter = () =>
  new Intl.DateTimeFormat(intlLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

const priceFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

/**
 * Map domain TicketSummary ke view props untuk ticket card.
 */
export function toTicketCardProps(ticket: TicketSummary): TicketCardProps {
  const { label, tone } = statusOf(ticket.status);

  return {
    id: ticket.id,
    eventName: ticket.event.name,
    eventDate: dateFormatter().format(new Date(ticket.event.date)),
    venue: ticket.event.venue,
    imageUrl: ticket.event.imageUrl ?? "/images/concert-placeholder.webp",
    // Baris tanpa nilai tidak ditampilkan: list di kontrak hanya mengirim kategori, harga, dan nomor tiket.
    details: [
      { label: t("ticket.detail.category"), value: ticket.category },
      ...(ticket.priceIdr > 0
        ? [{ label: t("ticket.detail.price"), value: priceFormatter.format(ticket.priceIdr) }]
        : []),
      ...(ticket.holderName ? [{ label: t("ticket.detail.holderName"), value: ticket.holderName }] : []),
      ...(ticket.nikMasked ? [{ label: t("ticket.detail.nik"), value: ticket.nikMasked, mono: true }] : []),
      { label: t("ticket.detail.ticketId"), value: ticket.id, mono: true },
    ],
    status: ticket.status,
    statusLabel: label,
    statusTone: tone,
  };
}

/** Map domain ETicket ke props halaman detail tiket. Field yang belum dikirim kontrak tidak ditampilkan. */
export function toETicketViewProps(eticket: ETicket, chrome: SiteChrome): ETicketViewProps {
  const { label, tone } = statusOf(eticket.status);
  const date = dateFormatter().format(new Date(eticket.event.date));
  const details: ETicketViewProps["details"] = [
    { label: t("ticket.detail.category"), value: eticket.category },
    ...(eticket.priceIdr > 0
      ? [{ label: t("ticket.detail.price"), value: priceFormatter.format(eticket.priceIdr) }]
      : []),
    { label: t("ticket.detail.ticketId"), value: eticket.id },
  ];
  const holder: ETicketViewProps["holder"] = [
    ...(eticket.holderName ? [{ label: t("ticket.detail.holderName"), value: eticket.holderName }] : []),
    { label: t("ticket.detail.nik"), value: eticket.nik },
    ...(eticket.holderEmail ? [{ label: t("ticket.detail.email"), value: eticket.holderEmail }] : []),
  ];

  return {
    ...chrome,
    header: {
      breadcrumb: [
        { label: t("checkout.breadcrumb.home"), href: "/" },
        { label: t("ticket.title"), href: "/tickets" },
        { label: eticket.id },
      ],
      heading: eticket.event.name,
      subtitle: t("ticket.detail.subtitle"),
    },
    eventName: eticket.event.name,
    eventDate: eticket.event.time ? t("ticket.detail.dateTime", { date, time: eticket.event.time }) : date,
    venue: eticket.event.venue,
    imageUrl: eticket.event.imageUrl ?? "/images/concert-placeholder.webp",
    statusLabel: label,
    statusTone: tone,
    qr: {
      title: t("ticket.detail.qr.title"),
      src: eticket.qrCode,
      alt: t("ticket.detail.qr.alt"),
      hint: t("ticket.detail.qr.hint"),
    },
    detailsTitle: t("ticket.detail.title"),
    details,
    holderTitle: t("ticket.detail.holder"),
    holder,
    instructions: eticket.instructions
      ? { title: t("ticket.detail.instructions"), text: eticket.instructions }
      : undefined,
  };
}
