import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, MapPinIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/primitives/Badge";
import { Card } from "@/components/ui/primitives/Card";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";

type Row = { label: string; value: string };

/** Props halaman detail tiket. Semua teks sudah diterjemahkan oleh mapper. */
export type ETicketViewProps = Omit<SiteShellProps, "children"> & {
  back: { label: string; href: string };
  eventName: string;
  eventDate: string;
  venue: string;
  imageUrl: string;
  statusLabel: string;
  statusTone: "success" | "info" | "warning" | "danger";
  qr: { src: string; alt: string; hint: string };
  detailsTitle: string;
  details: Row[];
  holderTitle: string;
  holder: Row[];
  instructions?: { title: string; text: string };
};

const badgeVariant: Record<ETicketViewProps["statusTone"], NonNullable<BadgeProps["variant"]>> = {
  success: "success",
  danger: "error",
  info: "info",
  warning: "warning",
};

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <dt className="type-body2 text-muted-foreground">{row.label}</dt>
          <dd className="type-body2 text-right font-medium break-all tabular-nums text-foreground">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Detail tiket yang sudah dibeli, dengan QR untuk masuk venue. Requirement 7.1. */
export function ETicketView({
  nav,
  footer,
  back,
  eventName,
  eventDate,
  venue,
  imageUrl,
  statusLabel,
  statusTone,
  qr,
  detailsTitle,
  details,
  holderTitle,
  holder,
  instructions,
}: ETicketViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <Link
          href={back.href}
          className="type-body2 inline-flex items-center gap-1 self-start text-primary hover:underline"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {back.label}
        </Link>
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-[2/1] overflow-hidden">
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
            <div className="absolute right-4 bottom-4 left-4">
              <Badge variant={badgeVariant[statusTone]} className="mb-2">
                {statusLabel}
              </Badge>
              <h1 className="type-h5 text-background">{eventName}</h1>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-b border-border p-4">
            <p className="type-body2 flex items-center gap-2 text-muted-foreground">
              <CalendarIcon aria-hidden="true" className="size-4" />
              {eventDate}
            </p>
            <p className="type-body2 flex items-center gap-2 text-muted-foreground">
              <MapPinIcon aria-hidden="true" className="size-4" />
              {venue}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 border-b border-border p-6">
            <div className="rounded-lg border-2 border-dashed border-border p-4">
              {/* QR berupa data URL dari BE; next/image tidak mengoptimalkan data URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.src} alt={qr.alt} width={200} height={200} className="size-[200px]" />
            </div>
            <p className="type-body2 text-center text-muted-foreground">{qr.hint}</p>
          </div>

          <section
            aria-labelledby="ticket-details"
            className="flex flex-col gap-3 border-b border-border p-4"
          >
            <h2 id="ticket-details" className="type-body1 font-semibold">
              {detailsTitle}
            </h2>
            <Rows rows={details} />
          </section>

          <section aria-labelledby="ticket-holder" className="flex flex-col gap-3 p-4">
            <h2 id="ticket-holder" className="type-body1 font-semibold">
              {holderTitle}
            </h2>
            <Rows rows={holder} />
          </section>

          {instructions ? (
            <section className="border-t border-border bg-signal-bg-info p-4">
              <h2 className="type-body2 mb-2 font-medium text-foreground">{instructions.title}</h2>
              <p className="type-body2 whitespace-pre-line text-muted-foreground">{instructions.text}</p>
            </section>
          ) : null}
        </Card>
      </div>
    </SiteShell>
  );
}
