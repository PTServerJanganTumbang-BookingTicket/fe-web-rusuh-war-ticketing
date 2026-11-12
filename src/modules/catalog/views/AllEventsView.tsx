import { Navbar, type NavbarProps } from "@/components/ui/layout/Navbar";
import { Footer } from "@/components/ui/layout/Footer";
import { EmptyState } from "@/components/ui/layout/EmptyState";
import { CardGridSkeleton } from "@/components/ui/layout/PageSkeleton";
import type { EventCardProps } from "./EventCard";
import { EventGrid, type EventGridProps } from "./EventGrid";

export type AllEventsViewProps = {
  nav: NavbarProps;
  title: string;
  subtitle: string;
  events: EventCardProps[];
  footer: { copyright: string; tagline: string; links?: { label: string; href: string }[] };
  grid: Pick<EventGridProps, "filterLabel" | "allLabel" | "emptyCategoryLabel" | "search">;
  emptyLabel: string;
  errorMessage?: string;
  /** Teks status memuat untuk pembaca layar; selama ada, kartu event tampil sebagai kerangka. */
  loading?: string;
};

/** Semua event, dengan filter kategori dan cari di sisi klien. */
export function AllEventsView({
  nav,
  title,
  subtitle,
  events,
  footer,
  grid,
  emptyLabel,
  errorMessage,
  loading,
}: AllEventsViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-signal-disable">
      <Navbar {...nav} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="type-h3 text-foreground">{title}</h1>
          <p className="type-body1 text-muted-foreground">{subtitle}</p>
        </div>
        {errorMessage && <EmptyState illustration="events" title={errorMessage} />}
        {loading ? (
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">{loading}</span>
            <CardGridSkeleton />
          </div>
        ) : null}
        {!loading && !errorMessage && events.length === 0 && (
          <EmptyState illustration="events" title={emptyLabel} />
        )}
        {events.length > 0 && <EventGrid events={events} {...grid} />}
      </main>
      <Footer {...footer} />
    </div>
  );
}
