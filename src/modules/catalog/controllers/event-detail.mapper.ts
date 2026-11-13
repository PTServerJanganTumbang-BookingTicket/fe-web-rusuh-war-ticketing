import { formatIdr } from "@/core/controllers/format-currency.utils";
import { t } from "@/core/i18n/t.utils";
import type { EventDetail, TicketCategory } from "../domain/event.model";
import type { EventDetailContentProps, TicketCategoryRowProps } from "../views/EventDetailView";
import { eventQueueHref, toEventCardProps } from "./event-card.mapper";

function toTicketCategoryRow(category: TicketCategory): TicketCategoryRowProps {
  const soldOut = category.status === "SOLD_OUT";
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    price: formatIdr(category.price),
    availabilityLabel: t(soldOut ? "eventDetail.ticket.soldOut" : "eventDetail.ticket.available"),
    soldOut,
  };
}

/** Harga termurah di antara kategori; tanpa kategori tidak ada harga yang bisa ditampilkan. */
function lowestPrice(categories: readonly TicketCategory[]): string | undefined {
  if (categories.length === 0) return undefined;
  return formatIdr(Math.min(...categories.map((category) => category.price)));
}

/**
 * Detail event → isi layar. Chip status dan tombol memakai aturan kartu Home (`toEventCardProps`, blok `display`
 * server), jadi kartu dan halaman detail tidak pernah berbeda pendapat tentang boleh tidaknya membeli.
 */
export function toEventDetailViewProps(event: EventDetail): EventDetailContentProps {
  const card = toEventCardProps(event);
  const price = lowestPrice(event.ticketCategories);
  const canBuy = card.cta.href !== undefined;
  return {
    breadcrumb: [{ label: t("eventDetail.breadcrumb.home"), href: "/" }, { label: event.name }],
    name: event.name,
    imageUrl: card.imageUrl,
    category: card.category,
    statusLabel: card.statusLabel,
    statusTone: card.statusTone,
    facts: [
      { kind: "date", label: t("eventDetail.date"), value: card.date },
      ...(event.time ? [{ kind: "time" as const, label: t("eventDetail.time"), value: event.time }] : []),
      { kind: "venue", label: t("eventDetail.venue"), value: event.venue },
    ],
    description: event.description
      ? { title: t("eventDetail.description.title"), body: event.description }
      : undefined,
    tickets: {
      title: t("eventDetail.tickets.title"),
      subtitle: t("eventDetail.tickets.subtitle"),
      emptyLabel: t("eventDetail.tickets.empty"),
      items: event.ticketCategories.map(toTicketCategoryRow),
    },
    purchase: {
      title: t("eventDetail.purchase.title"),
      price: price ? { label: t("eventDetail.price.from"), value: price } : undefined,
      cta: {
        label: card.cta.label,
        // Antrian tetap wajib: dari halaman ini pembeli selalu lewat Waiting Room, tidak pernah langsung ke /book.
        href: canBuy ? eventQueueHref(event.id) : undefined,
      },
      hint: canBuy ? t("eventDetail.cta.hint") : undefined,
    },
  };
}
