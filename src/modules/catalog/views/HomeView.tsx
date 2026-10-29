import { Alert } from "@/core/views/design-system/primitives/Alert";
import { ScreenFrame } from "@/core/views/design-system/layout/ScreenFrame";
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

function renderContent({
  errorMessage,
  emptyLabel,
  events,
}: Pick<HomeViewProps, "errorMessage" | "emptyLabel" | "events">) {
  if (errorMessage) {
    return (
      <Alert variant="error" role="alert">
        {errorMessage}
      </Alert>
    );
  }
  if (events.length === 0) {
    return <p className="type-body1 text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => (
        <EventCard key={event.id} {...event} />
      ))}
    </ul>
  );
}

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
      {renderContent({ errorMessage, emptyLabel, events })}
    </ScreenFrame>
  );
}
