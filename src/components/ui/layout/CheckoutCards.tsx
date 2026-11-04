import type { ReactNode } from "react";
import { CalendarIcon, MapPinIcon, TimerIcon } from "lucide-react";
import { Badge } from "../badge";
import { Card, CardContent } from "../card";
import { cn } from "../cn.utils";
import { EventCover } from "./EventCover";

export type CountdownBannerProps = {
  title: string;
  hint: string;
  /** "mm:ss" dari jam server (ADR-0005). */
  value: string;
  urgent?: boolean;
  urgentLabel?: string;
};

/** Pengingat batas waktu sesi atau pembayaran. Angka berubah tiap detik, jadi tidak diumumkan (aria-live off). */
export function CountdownBanner({ title, hint, value, urgent, urgentLabel }: CountdownBannerProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 sm:px-5 sm:py-4",
        urgent
          ? "border-signal-error/40 bg-signal-bg-error text-signal-error"
          : "border-signal-warning/40 bg-signal-bg-warning text-signal-warning",
      )}
    >
      <TimerIcon aria-hidden="true" className="size-5 shrink-0" />
      <div className="min-w-0 flex-1 text-foreground">
        <p className="type-body1">{title}</p>
        <p className="type-body2">{hint}</p>
      </div>
      <p role="timer" aria-live="off" className="type-h5 shrink-0 tabular-nums sm:type-h4">
        {value}
      </p>
      {urgent && urgentLabel ? (
        <p role="alert" className="sr-only">
          {urgentLabel}
        </p>
      ) : null}
    </section>
  );
}

export type EventSummaryCardProps = {
  imageUrl: string;
  tag: string;
  name: string;
  date: string;
  venue: string;
};

/** Kartu event di kolom samping alur pembelian (Waiting Room, Detail Tiket, Pembayaran). */
export function EventSummaryCard({ imageUrl, tag, name, date, venue }: EventSummaryCardProps) {
  return (
    <Card className="gap-0 rounded-2xl py-0">
      <EventCover src={imageUrl} className="aspect-[2/1]" />
      <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
        <Badge className="type-body2 h-auto w-fit rounded-full bg-brand-tint px-3 py-1 text-primary uppercase">
          {tag}
        </Badge>
        <h2 className="type-h6 text-foreground">{name}</h2>
        <p className="type-body1 flex items-center gap-3 text-muted-foreground">
          <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />
          {date}
        </p>
        <p className="type-body1 flex items-center gap-3 text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
          {venue}
        </p>
      </CardContent>
    </Card>
  );
}

export type OrderLine = { label: string; detail: string; amount: string };

export type OrderSummaryCardProps = {
  title: string;
  lines: OrderLine[];
  emptyLabel?: string;
  totalLabel: string;
  total: string;
  /** Tombol utama (lanjut atau bayar); diisi pemanggil supaya bisa berupa tombol atau form submit. */
  action?: ReactNode;
  footnote?: string;
};

export function OrderSummaryCard({
  title,
  lines,
  emptyLabel,
  totalLabel,
  total,
  action,
  footnote,
}: OrderSummaryCardProps) {
  return (
    <Card className="gap-0 rounded-2xl py-0">
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="type-title text-foreground">{title}</h2>
        {lines.length === 0 && emptyLabel ? (
          <p className="type-body2 text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((line) => (
              <li key={line.label} className="flex items-start justify-between gap-3">
                <div>
                  <p className="type-body1 text-foreground">{line.label}</p>
                  <p className="type-body2 text-muted-foreground">{line.detail}</p>
                </div>
                <p className="type-body1 shrink-0 tabular-nums">{line.amount}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="type-body2 text-muted-foreground">{totalLabel}</p>
          <p className="type-h5 text-primary tabular-nums">{total}</p>
        </div>
        {action}
        {footnote ? <p className="type-body2 text-center text-muted-foreground">{footnote}</p> : null}
      </CardContent>
    </Card>
  );
}
