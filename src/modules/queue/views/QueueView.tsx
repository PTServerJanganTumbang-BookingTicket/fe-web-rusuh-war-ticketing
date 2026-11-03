import Link from "next/link";
import {
  CalendarIcon,
  ClockIcon,
  IdCardIcon,
  InfoIcon,
  MapPinIcon,
  TicketIcon,
  WifiIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/components/ui/cn.utils";
import { EventCover } from "@/components/ui/layout/EventCover";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";
import { Progress } from "@/components/ui/primitives/Progress";

export type QueueStatusProps = {
  state: "loading" | "waiting" | "admitted" | "error";
  badge?: { label: string; tone: "success" | "info" | "error" };
  /** Pesan untuk state selain waiting. */
  message?: string;
  position?: { label: string; value: string; suffix: string };
  eta?: { label: string; value: string };
  progress?: { percent: number; label: string };
  updatedNote?: string;
  note?: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
};

export type QueueEventCardProps = {
  imageUrl: string;
  tag: string;
  name: string;
  date: string;
  venue: string;
};

export type QueueTip = { icon: "nik" | "tickets" | "connection"; text: string };

export type QueueViewProps = Omit<SiteShellProps, "children"> & {
  breadcrumb: { label: string; href?: string }[];
  heading: string;
  subtitle: string;
  status: QueueStatusProps;
  event?: QueueEventCardProps;
  tips: { title: string; items: QueueTip[] };
};

const tipIcons = { nik: IdCardIcon, tickets: TicketIcon, connection: WifiIcon };

// Kelas ditulis utuh supaya terdeteksi Tailwind.
const badgeTone = {
  success: "bg-signal-bg-valid text-signal-valid",
  info: "bg-signal-bg-info text-signal-info",
  error: "bg-signal-bg-error text-signal-error",
};

export function QueueView({
  nav,
  footer,
  breadcrumb,
  heading,
  subtitle,
  status,
  event,
  tips,
}: QueueViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="type-body2 flex flex-wrap items-center gap-2 text-muted-foreground">
          {breadcrumb.map((crumb, index) => (
            <li key={crumb.label} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <h1 className="type-h2 text-foreground">{heading}</h1>
      <p className="type-title mt-2 text-muted-foreground">{subtitle}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <StatusCard {...status} />
        <aside className="flex flex-col gap-8">
          {event ? <EventCard {...event} /> : null}
          <section aria-labelledby="queue-tips" className="px-1">
            <h2 id="queue-tips" className="type-title text-muted-foreground">
              {tips.title}
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {tips.items.map((tip) => {
                const Icon = tipIcons[tip.icon];
                return (
                  <li key={tip.icon} className="type-body2 flex items-center gap-3 text-muted-foreground">
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {tip.text}
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </SiteShell>
  );
}

function StatusCard({
  state,
  badge,
  message,
  position,
  eta,
  progress,
  updatedNote,
  note,
  action,
}: QueueStatusProps) {
  return (
    <Card className="gap-0 rounded-2xl py-0">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-10">
        <div aria-live="polite" className="flex flex-col items-center gap-3 text-center">
          {badge ? (
            <Badge
              className={cn("type-body2 h-auto rounded-full px-3 py-1 uppercase", badgeTone[badge.tone])}
            >
              {badge.label}
            </Badge>
          ) : null}
          {state === "waiting" && position ? (
            <>
              <p className="type-title text-muted-foreground">{position.label}</p>
              <p className="type-h1 text-primary tabular-nums">{position.value}</p>
              <p className="type-title text-muted-foreground">{position.suffix}</p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6">
              {state === "loading" ? <Spinner className="size-6 text-primary" /> : null}
              <p className={cn("type-title", state === "error" ? "text-signal-error" : "text-foreground")}>
                {message}
              </p>
              {action ? (
                <Button size="lg" onClick={action.onClick} disabled={action.disabled}>
                  {action.label}
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {state === "waiting" ? (
          <>
            <Separator />
            {eta ? (
              <div className="flex items-center gap-4 rounded-xl border border-border px-5 py-4">
                <ClockIcon aria-hidden="true" className="size-6 shrink-0 text-primary" />
                <div>
                  <p className="type-body2 text-muted-foreground">{eta.label}</p>
                  <p className="type-h5 text-foreground">{eta.value}</p>
                </div>
              </div>
            ) : null}
            {progress ? (
              <div className="flex flex-col gap-3">
                <Progress value={progress.percent} aria-label={progress.label} />
                {updatedNote ? (
                  <p className="type-body2 text-center text-muted-foreground">{updatedNote}</p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {note ? (
          <Alert variant="info" role="note" className="border-signal-info">
            <InfoIcon />
            <AlertDescription className="type-body1 text-foreground">{note}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EventCard({ imageUrl, tag, name, date, venue }: QueueEventCardProps) {
  return (
    <Card className="gap-0 rounded-2xl py-0">
      <EventCover src={imageUrl} className="aspect-[2/1]" />
      <CardContent className="flex flex-col gap-3 p-6">
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
