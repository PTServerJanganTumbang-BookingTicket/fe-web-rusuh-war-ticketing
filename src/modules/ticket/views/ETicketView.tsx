import type { ReactNode } from "react";
import Image from "next/image";
import { CalendarIcon, IdCardIcon, InfoIcon, MapPinIcon, QrCodeIcon, TicketIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/primitives/Badge";
import { PageHeader, type PageHeaderProps } from "@/components/ui/layout/PageHeader";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";

type Row = { label: string; value: string };

/** Props halaman detail tiket. Semua teks sudah diterjemahkan oleh mapper. */
export type ETicketViewProps = Omit<SiteShellProps, "children"> & {
  header: PageHeaderProps;
  eventName: string;
  eventDate: string;
  venue: string;
  imageUrl: string;
  statusLabel: string;
  statusTone: "success" | "info" | "warning" | "danger";
  qr: { title: string; src: string; alt: string; hint: string };
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
    <dl className="flex flex-col divide-y divide-border rounded-xl border border-border">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="type-body2 text-muted-foreground">{row.label}</dt>
          <dd className="type-body2 text-right font-medium break-all tabular-nums text-foreground">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="type-h6 flex items-center gap-2">
      {icon}
      {children}
    </h2>
  );
}

/** Detail tiket yang sudah dibeli, dengan QR untuk masuk venue. Requirement 7.1. */
export function ETicketView({
  nav,
  footer,
  header,
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
      <PageHeader {...header} />
      <div className="mt-6 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="gap-0 overflow-hidden rounded-2xl py-0">
            <div className="relative aspect-[21/9] overflow-hidden">
              <Image
                src={imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 760px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
              <div className="absolute right-5 bottom-5 left-5 flex flex-col gap-2">
                <Badge variant={badgeVariant[statusTone]} className="self-start">
                  {statusLabel}
                </Badge>
                <p className="type-h4 text-background">{eventName}</p>
              </div>
            </div>
            <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:gap-8 sm:p-6">
              <p className="type-body1 flex items-center gap-2 text-muted-foreground">
                <CalendarIcon aria-hidden="true" className="size-4 text-primary" />
                {eventDate}
              </p>
              <p className="type-body1 flex items-center gap-2 text-muted-foreground">
                <MapPinIcon aria-hidden="true" className="size-4 text-primary" />
                {venue}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="gap-0 rounded-2xl py-0">
              <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
                <section aria-labelledby="ticket-details" className="flex flex-col gap-4">
                  <SectionTitle icon={<TicketIcon aria-hidden="true" className="size-5 text-primary" />}>
                    <span id="ticket-details">{detailsTitle}</span>
                  </SectionTitle>
                  <Rows rows={details} />
                </section>
              </CardContent>
            </Card>
            <Card className="gap-0 rounded-2xl py-0">
              <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
                <section aria-labelledby="ticket-holder" className="flex flex-col gap-4">
                  <SectionTitle icon={<IdCardIcon aria-hidden="true" className="size-5 text-primary" />}>
                    <span id="ticket-holder">{holderTitle}</span>
                  </SectionTitle>
                  <Rows rows={holder} />
                </section>
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="gap-0 rounded-2xl py-0">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <SectionTitle icon={<QrCodeIcon aria-hidden="true" className="size-5 text-primary" />}>
                {qr.title}
              </SectionTitle>
              <div className="rounded-2xl border-2 border-dashed border-border bg-background p-4">
                {/* QR berupa data URL dari BE; next/image tidak mengoptimalkan data URL. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr.src} alt={qr.alt} width={220} height={220} className="size-[220px]" />
              </div>
              <p className="type-body2 text-muted-foreground">{qr.hint}</p>
            </CardContent>
          </Card>
          {instructions ? (
            <Alert variant="info" role="note" className="border-signal-info">
              <InfoIcon />
              <AlertDescription className="text-foreground">
                <span className="font-semibold">{instructions.title}. </span>
                {instructions.text}
              </AlertDescription>
            </Alert>
          ) : null}
        </aside>
      </div>
    </SiteShell>
  );
}
