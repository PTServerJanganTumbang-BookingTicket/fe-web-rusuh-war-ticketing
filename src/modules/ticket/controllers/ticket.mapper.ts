import type { TicketSummary, ETicket, TicketStatus } from "../domain/ticket.model";
import type { TicketCardProps } from "../views/TicketCard";
import type { ETicketViewProps } from "../views/ETicketView";

const statusConfig: Record<TicketStatus, { label: string; tone: TicketCardProps["statusTone"] }> = {
  ISSUED: { label: "Aktif", tone: "success" },
  USED: { label: "Telah Digunakan", tone: "info" },
  CANCELLED: { label: "Dibatalkan", tone: "danger" },
  EXPIRED: { label: "Kadaluarsa", tone: "warning" },
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
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
  const { label, tone } = statusConfig[ticket.status];

  return {
    id: ticket.id,
    eventName: ticket.event.name,
    eventDate: dateFormatter.format(new Date(ticket.event.date)),
    venue: ticket.event.venue,
    imageUrl: ticket.event.imageUrl ?? "/images/concert-placeholder.webp",
    category: ticket.category,
    seatNumber: ticket.seatNumber,
    holderName: ticket.holderName,
    nikMasked: ticket.nikMasked,
    status: ticket.status,
    statusLabel: label,
    statusTone: tone,
  };
}

/**
 * Map domain ETicket ke view props untuk e-ticket detail.
 */
export function toETicketViewProps(eticket: ETicket): ETicketViewProps {
  const { label, tone } = statusConfig[eticket.status];

  return {
    id: eticket.id,
    eventName: eticket.event.name,
    eventDate: dateFormatter.format(new Date(eticket.event.date)),
    venue: eticket.event.venue,
    imageUrl: eticket.event.imageUrl ?? "/images/concert-placeholder.webp",
    category: eticket.category,
    priceFormatted: priceFormatter.format(eticket.priceIdr),
    seatNumber: eticket.seatNumber,
    holderName: eticket.holderName,
    holderEmail: eticket.holderEmail,
    nik: eticket.nik,
    status: eticket.status,
    statusLabel: label,
    statusTone: tone,
    qrCode: eticket.qrCode,
    instructions: eticket.instructions,
    issuedAt: eticket.issuedAt,
  };
}
