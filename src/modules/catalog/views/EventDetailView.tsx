import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/components/ui/cn.utils";
import { ArrowRightIcon, CalendarIcon, ClockIcon, MapPinIcon } from "@/components/ui/icons";
import { EventCover } from "@/components/ui/layout/EventCover";
import { Breadcrumb, type Crumb } from "@/components/ui/layout/PageHeader";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";

type Tone = "success" | "danger" | "info" | "warning";

export type TicketCategoryRowProps = {
  id: string;
  name: string;
  description?: string;
  /** Sudah diformat, mis. "Rp 1.500.000". */
  price: string;
  availabilityLabel: string;
  soldOut: boolean;
};

export type EventFact = { kind: "date" | "time" | "venue"; label: string; value: string };

export type PurchaseProps = {
  /** Nama bagian untuk pembaca layar. */
  title: string;
  price?: { label: string; value: string };
  /** Tanpa `href` tombol nonaktif dan `label` memuat alasannya (mis. "Buka 10 Nov 09:00"). */
  cta: { label: string; href?: string };
  hint?: string;
};

export type EventDetailContentProps = {
  breadcrumb: Crumb[];
  name: string;
  imageUrl: string;
  category: string;
  statusLabel: string;
  statusTone: Tone;
  facts: EventFact[];
  description?: { title: string; body: string };
  tickets: { title: string; subtitle: string; emptyLabel: string; items: TicketCategoryRowProps[] };
  purchase: PurchaseProps;
};

export type EventDetailViewProps = Omit<SiteShellProps, "children"> & EventDetailContentProps;

const badgeVariant: Record<Tone, NonNullable<BadgeProps["variant"]>> = {
  success: "success",
  danger: "error",
  info: "info",
  warning: "warning",
};

const factIcon = { date: CalendarIcon, time: ClockIcon, venue: MapPinIcon };

function PurchaseAction({ cta, className }: { cta: PurchaseProps["cta"]; className?: string }) {
  if (cta.href) {
    return (
      <Link href={cta.href} className={cn(buttonVariants({ size: "lg" }), "h-12", className)}>
        {cta.label}
        <ArrowRightIcon aria-hidden="true" className="size-5" />
      </Link>
    );
  }
  return (
    <Button disabled aria-disabled="true" variant="outline" size="lg" className={cn("h-12", className)}>
      {cta.label}
    </Button>
  );
}

function PurchasePrice({ price }: { price: NonNullable<PurchaseProps["price"]> }) {
  return (
    <p className="flex min-w-0 flex-col">
      <span className="type-body2 text-muted-foreground">{price.label}</span>
      <span className="type-h5 text-foreground">{price.value}</span>
    </p>
  );
}

function TicketCategoryRow({ name, description, price, availabilityLabel, soldOut }: TicketCategoryRowProps) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={cn("type-title-bold", soldOut ? "text-signal-text-disable" : "text-foreground")}>
            {name}
          </h3>
          <Badge variant={soldOut ? "error" : "success"} className="type-body2-bold h-6 px-3">
            {availabilityLabel}
          </Badge>
        </div>
        {description ? <p className="type-body1 text-muted-foreground">{description}</p> : null}
      </div>
      <p className={cn("type-title-bold shrink-0", soldOut ? "text-signal-text-disable" : "text-foreground")}>
        {price}
      </p>
    </li>
  );
}

/**
 * Detail satu event: sampul, info, deskripsi, kategori tiket, dan satu aksi beli. Di layar kecil aksi menempel di
 * bawah viewport selama isi digulir; mulai `lg` aksi ada di kolom samping, jadi hanya satu yang pernah tampil.
 */
export function EventDetailView({
  nav,
  footer,
  breadcrumb,
  name,
  imageUrl,
  category,
  statusLabel,
  statusTone,
  facts,
  description,
  tickets,
  purchase,
}: EventDetailViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <div className="flex flex-col gap-6">
        <Breadcrumb items={breadcrumb} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
          <article className="flex min-w-0 flex-col gap-6">
            <div className="relative overflow-hidden rounded-2xl">
              <EventCover src={imageUrl} className="aspect-[16/9]" />
              <Badge
                variant={badgeVariant[statusTone]}
                className="type-body2-bold absolute top-3 left-3 h-6 px-3"
              >
                {statusLabel}
              </Badge>
            </div>

            <header className="flex flex-col gap-3">
              <p className="type-body2-bold tracking-wide text-primary uppercase">{category}</p>
              <h1 className="type-h3 sm:type-h2 text-foreground">{name}</h1>
              <dl className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
                {facts.map((fact) => {
                  const Icon = factIcon[fact.kind];
                  return (
                    <div key={fact.kind} className="type-body1 flex items-center gap-2 text-muted-foreground">
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      <dt className="sr-only">{fact.label}</dt>
                      <dd>{fact.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </header>

            {description ? (
              <section aria-labelledby="event-description" className="flex flex-col gap-2">
                <h2 id="event-description" className="type-h5 text-foreground">
                  {description.title}
                </h2>
                <p className="type-title whitespace-pre-line text-muted-foreground">{description.body}</p>
              </section>
            ) : null}

            <section aria-labelledby="event-tickets" className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 id="event-tickets" className="type-h5 text-foreground">
                  {tickets.title}
                </h2>
                <p className="type-body1 text-muted-foreground">{tickets.subtitle}</p>
              </div>
              <Card className="rounded-2xl">
                <CardContent className="px-5 sm:px-6">
                  {tickets.items.length > 0 ? (
                    <ul className="divide-y divide-border">
                      {tickets.items.map((item) => (
                        <TicketCategoryRow key={item.id} {...item} />
                      ))}
                    </ul>
                  ) : (
                    <p className="type-body1 text-muted-foreground">{tickets.emptyLabel}</p>
                  )}
                </CardContent>
              </Card>
            </section>
          </article>

          <aside aria-label={purchase.title} className="hidden lg:sticky lg:top-24 lg:block">
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col gap-4 px-6">
                {purchase.price ? <PurchasePrice price={purchase.price} /> : null}
                <PurchaseAction cta={purchase.cta} className="w-full" />
                {purchase.hint ? <p className="type-body2 text-muted-foreground">{purchase.hint}</p> : null}
              </CardContent>
            </Card>
          </aside>
        </div>

        <section
          aria-label={purchase.title}
          className="sticky bottom-0 z-20 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 sm:-mx-6 sm:px-6 lg:hidden"
        >
          {purchase.price ? <PurchasePrice price={purchase.price} /> : null}
          <PurchaseAction cta={purchase.cta} className={purchase.price ? "shrink-0" : "w-full"} />
        </section>
      </div>
    </SiteShell>
  );
}
