import Image from "next/image";
import { Badge, type BadgeProps } from "@/components/ui/primitives/Badge";
import { Card } from "@/components/ui/primitives/Card";
import type { TicketStatus } from "../domain/ticket.model";

/**
 * View model untuk e-ticket detail page.
 */
export type ETicketViewProps = {
  id: string;
  eventName: string;
  eventDate: string;
  venue: string;
  imageUrl: string;
  category: string;
  priceFormatted: string;
  seatNumber?: string;
  holderName: string;
  holderEmail: string;
  nik: string;
  status: TicketStatus;
  statusLabel: string;
  statusTone: "success" | "info" | "warning" | "danger";
  qrCode: string;
  instructions: string;
  issuedAt: string;
};

const badgeVariant: Record<ETicketViewProps["statusTone"], NonNullable<BadgeProps["variant"]>> = {
  success: "success",
  danger: "error",
  info: "info",
  warning: "warning",
};

/**
 * E-Ticket detail view with QR code.
 * Ref: Requirement 7.1 — e-tiket berisi NIK_Attendee, kategori, nomor bangku, QR code.
 */
export function ETicketView({
  eventName,
  eventDate,
  venue,
  imageUrl,
  category,
  priceFormatted,
  seatNumber,
  holderName,
  holderEmail,
  nik,
  statusLabel,
  statusTone,
  qrCode,
  instructions,
}: ETicketViewProps) {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card className="overflow-hidden p-0">
        {/* Event Header */}
        <div className="relative aspect-[2/1] overflow-hidden">
          <Image
            src={imageUrl || "/images/placeholder-event.jpg"}
            alt={eventName}
            fill
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <Badge variant={badgeVariant[statusTone]} className="mb-2">
              {statusLabel}
            </Badge>
            <h1 className="type-h5 text-white">{eventName}</h1>
          </div>
        </div>

        {/* Event Info */}
        <div className="border-b border-signal-disable p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg
              width="16"
              height="16"
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
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <svg
              width="16"
              height="16"
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
            <span>{venue}</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center border-b border-signal-disable p-6">
          <div className="mb-4 rounded-lg border-2 border-dashed border-signal-disable p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="QR Code untuk masuk venue"
              width={200}
              height={200}
              className="h-[200px] w-[200px]"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Tunjukkan QR code ini di pintu masuk venue
          </p>
        </div>

        {/* Ticket Details */}
        <div className="space-y-3 p-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kategori</span>
            <span className="font-medium text-foreground">{category}</span>
          </div>
          {seatNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nomor Seat</span>
              <span className="font-medium text-foreground">{seatNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Harga</span>
            <span className="font-medium text-foreground">{priceFormatted}</span>
          </div>
          <div className="border-t border-signal-disable pt-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nama Pemegang</span>
              <span className="font-medium text-foreground">{holderName}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">NIK</span>
              <span className="font-mono text-sm text-muted-foreground">{nik}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-sm text-muted-foreground">{holderEmail}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {instructions && (
          <div className="border-t border-signal-disable bg-signal-bg-info p-4">
            <h2 className="type-body2 mb-2 font-medium text-foreground">Instruksi Masuk</h2>
            <p className="type-body2 whitespace-pre-line text-muted-foreground">{instructions}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
