import { Navbar, type NavbarProps } from "@/components/ui/layout/Navbar";
import { Footer } from "@/components/ui/layout/Footer";
import { EmptyState } from "@/components/ui/layout/EmptyState";
import { CardGridSkeleton } from "@/components/ui/layout/PageSkeleton";
import { HeroSection } from "./HeroSection";
import type { EventCardProps } from "./EventCard";
import { EventGrid } from "./EventGrid";

export type HomeViewProps = {
  nav: NavbarProps;
  hero: {
    eyebrow: string;
    headline: string;
    subtext: string;
    backgroundImage?: string;
  };
  eventList: {
    title: string;
    subtitle: string;
  };
  events: EventCardProps[];
  footer: {
    copyright: string;
    tagline: string;
    infoBanner?: string;
    links?: { label: string; href: string }[];
  };
  emptyLabel?: string;
  /** Teks filter kategori; tanpa ini daftar tampil tanpa filter. */
  categoryFilter?: { label: string; all: string; empty: string };
  errorMessage?: string;
  /** Teks status memuat untuk pembaca layar; selama ada, kartu event tampil sebagai kerangka. */
  loading?: string;
};

export function HomeView(props: HomeViewProps) {
  const { nav, hero, eventList, events, footer, emptyLabel, categoryFilter, errorMessage, loading } = props;
  return (
    <div className="flex min-h-screen flex-col bg-signal-disable">
      <Navbar {...nav} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <HeroSection {...hero} />
        <section className="mt-10">
          <div className="mb-6">
            <h2 className="type-h3 text-foreground">{eventList.title}</h2>
            <p className="type-body1 text-muted-foreground">{eventList.subtitle}</p>
          </div>
          {errorMessage && <EmptyState illustration="events" title={errorMessage} />}
          {loading ? (
            <div role="status" aria-live="polite" aria-busy="true">
              <span className="sr-only">{loading}</span>
              <CardGridSkeleton />
            </div>
          ) : null}
          {!loading && !errorMessage && events.length === 0 && (
            <EmptyState illustration="events" title={emptyLabel ?? ""} />
          )}
          {events.length > 0 && (
            <EventGrid
              events={events}
              filterLabel={categoryFilter?.label ?? ""}
              allLabel={categoryFilter?.all ?? ""}
              emptyCategoryLabel={categoryFilter?.empty ?? ""}
            />
          )}
        </section>
      </main>
      <Footer {...footer} />
    </div>
  );
}
