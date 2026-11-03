import Image from "next/image";
import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui/primitives/Badge";
import { Card } from "@/components/ui/primitives/Card";
import type { TicketStatus } from "../domain/ticket.model";

/**
 * View model untuk ticket card dalam list.
 */
export type TicketCardProps = {
  id: string;
  eventName: string;
  eventDate: string;
  venue: string;
  imageUrl: string;
  category: string;
  seatNumber?: string;
  holderName: string;
  nikMasked: string;
  status: TicketStatus;
  statusLabel: string;
  statusTone: "success" | "info" | "warning" | "danger";
};

const badgeVariant: Record<TicketCardProps["statusTone"], NonNullable<BadgeProps["variant"]>> = {
  success: "success",
  danger: "error",
  info: "info",
  warning: "warning",
};

/**
 * Ticket card for My Tickets list.
 * Shows ticket summary with event info and status badge.
 */
export function TicketCard({
  id,
  eventName,
  eventDate,
  venue,
  imageUrl,
  category,
  seatNumber,
  holderName,
  nikMasked,
  statusLabel,
  statusTone,
}: TicketCardProps) {
  return (
    <Link href={`/tickets/${id}`} className="block">
      <Card className="overflow-hidden p-0 transition-shadow hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={imageUrl || "/images/placeholder-event.jpg"}
            alt={eventName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <Badge variant={badgeVariant[statusTone]} className="absolute left-3 top-3">
            {statusLabel}
          </Badge>
        </div>
        <div className="p-4">
          <h3 className="type-h6 mb-2 truncate text-foreground">{eventName}</h3>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{eventDate}</span>
          </div>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{venue}</span>
          </div>
          <div className="space-y-1 border-t border-signal-disable pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kategori</span>
              <span className="font-medium text-foreground">{category}</span>
            </div>
            {seatNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seat</span>
                <span className="font-medium text-foreground">{seatNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nama</span>
              <span className="font-medium text-foreground">{holderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">NIK</span>
              <span className="font-mono text-xs text-muted-foreground">{nikMasked}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
