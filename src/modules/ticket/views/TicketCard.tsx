import Image from "next/image";
import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon } from "@/components/ui/icons";
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
  holderName: string;
  nikMasked: string;
  status: TicketStatus;
  statusLabel: string;
  statusTone: "success" | "info" | "warning" | "danger";
  /** Label baris detail dari i18n. */
  labels: { category: string; holderName: string; nik: string };
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
  holderName,
  nikMasked,
  statusLabel,
  statusTone,
  labels,
}: TicketCardProps) {
  return (
    <Link href={`/tickets/${id}`} className="block">
      <Card className="gap-0 overflow-hidden rounded-xl py-0 transition-shadow hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={imageUrl || "/images/concert-placeholder.webp"}
            alt={eventName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <Badge
            variant={badgeVariant[statusTone]}
            className="absolute left-3 top-3 h-6 px-3 text-xs font-semibold"
          >
            {statusLabel}
          </Badge>
        </div>
        <div className="p-4">
          <h3 className="type-h6 mb-2 truncate text-foreground">{eventName}</h3>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span>{eventDate}</span>
          </div>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{venue}</span>
          </div>
          <div className="space-y-1 border-t border-signal-disable pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{labels.category}</span>
              <span className="font-medium text-foreground">{category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{labels.holderName}</span>
              <span className="font-medium text-foreground">{holderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{labels.nik}</span>
              <span className="font-mono text-xs text-muted-foreground">{nikMasked}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
