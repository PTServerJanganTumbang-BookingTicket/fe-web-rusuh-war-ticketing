import { Sparkles } from "lucide-react";
import { Alert } from "../primitives/Alert";
import { EventCard, type EventCardProps } from "./EventCard";

export type HomeViewProps = {
  hero: { eyebrow: string; title: string; subtitle: string };
  listLabel: string;
  listDescription: string;
  emptyLabel: string;
  /** Diisi bila daftar acara gagal dimuat. */
  errorMessage?: string;
  events: EventCardProps[];
};

/** Home (Figma SJT ZAKI Component 1, wireframe 9.1): hero lalu daftar event. Navbar dan login milik AppShell. */
export function HomeView({ hero, listLabel, listDescription, emptyLabel, errorMessage, events }: HomeViewProps) {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <section className="rounded-2xl bg-brand-dark px-6 py-8 text-white sm:px-10 sm:py-14">
        <p className="type-body2 flex items-center gap-2 font-medium tracking-[0.08em] uppercase opacity-80">
          <Sparkles aria-hidden className="size-4" />
          {hero.eyebrow}
        </p>
        <h1 className="type-h3 mt-3 max-w-2xl">{hero.title}</h1>
        <p className="type-body1 mt-3 max-w-xl opacity-80">{hero.subtitle}</p>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="type-h4">{listLabel}</h2>
          <p className="type-body1 mt-1 text-muted-foreground">{listDescription}</p>
        </div>
        {errorMessage ? (
          <Alert variant="error" role="alert">
            {errorMessage}
          </Alert>
        ) : events.length === 0 ? (
          <p className="type-body1 text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
