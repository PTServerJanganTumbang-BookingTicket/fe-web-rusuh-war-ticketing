import { Navbar, type NavbarProps } from "@/components/ui/layout/Navbar";
import { Footer } from "@/components/ui/layout/Footer";
import { CardGridSkeleton } from "@/components/ui/layout/PageSkeleton";
import { HeroSection } from "./HeroSection";
import { EventCard, type EventCardProps } from "./EventCard";

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
  errorMessage?: string;
  /** Teks status memuat untuk pembaca layar; selama ada, kartu event tampil sebagai kerangka. */
  loading?: string;
};

export function HomeView(props: HomeViewProps) {
  const { nav, hero, eventList, events, footer, emptyLabel, errorMessage, loading } = props;
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
          {errorMessage && (
            <div className="rounded-lg bg-signal-bg-error p-4 text-signal-error">{errorMessage}</div>
          )}
          {loading ? (
            <div role="status" aria-live="polite" aria-busy="true">
              <span className="sr-only">{loading}</span>
              <CardGridSkeleton />
            </div>
          ) : null}
          {!loading && !errorMessage && events.length === 0 && (
            <p className="type-body1 text-muted-foreground">{emptyLabel}</p>
          )}
          {events.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer {...footer} />
    </div>
  );
}
