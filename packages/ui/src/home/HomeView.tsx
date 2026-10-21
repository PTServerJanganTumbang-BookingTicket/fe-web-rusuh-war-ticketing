import { Alert } from "../primitives/Alert";
import { ScreenFrame } from "../shared/ScreenFrame";
import { EventCard, type EventCardProps } from "./EventCard";

export type HomeViewProps = {
  title: string;
  login: { label: string; href: string };
  listLabel: string;
  emptyLabel: string;
  /** Diisi bila daftar acara gagal dimuat. */
  errorMessage?: string;
  events: EventCardProps[];
};

export function HomeView({ title, login, listLabel, emptyLabel, errorMessage, events }: HomeViewProps) {
  return (
    <ScreenFrame
      title={title}
      trailing={
        <a href={login.href} className="font-semibold hover:underline">
          {login.label}
        </a>
      }
    >
      <h2 className="type-body1 text-muted-foreground">{listLabel}</h2>
      {errorMessage ? (
        <Alert variant="error" role="alert">
          {errorMessage}
        </Alert>
      ) : events.length === 0 ? (
        <p className="type-body1 text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </ul>
      )}
    </ScreenFrame>
  );
}
