import { ClockIcon, IdCardIcon, InfoIcon, TicketIcon, WifiIcon } from "@/components/ui/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/cn.utils";
import { ActionDialog, type ActionDialogProps } from "@/components/ui/layout/ActionDialog";
import { EventSummaryCard, type EventSummaryCardProps } from "@/components/ui/layout/CheckoutCards";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";
import { Progress } from "@/components/ui/progress";

export type QueueStatusProps = {
  state: "loading" | "waiting" | "admitted" | "error";
  badge?: { label: string; tone: "success" | "info" | "error" };
  /** Pesan untuk state selain waiting. */
  message?: string;
  position?: { label: string; value: string; suffix: string };
  eta?: { label: string; value: string };
  progress?: { percent: number; label: string };
  updatedNote?: string;
  /** Data antrian belum diperbarui server: angka tetap tampil tapi diredupkan. */
  stale?: boolean;
  /** Info sale (mis. stok sedang habis) yang tidak mengakhiri antrian. */
  notice?: string;
  note?: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
  /** Ambil ulang posisi; hanya saat pembaruan otomatis berhenti (stream dan polling gagal). */
  refresh?: { label: string; onClick: () => void; disabled?: boolean };
  /** Keluar dari antrian; hanya saat menunggu. Membuka dialog konfirmasi. */
  leave?: { label: string; onClick: () => void };
};

export type QueueEventCardProps = EventSummaryCardProps;

export type QueueTip = { icon: "nik" | "tickets" | "connection"; text: string };

export type QueueViewProps = Omit<SiteShellProps, "children"> & {
  breadcrumb: { label: string; href?: string }[];
  heading: string;
  subtitle: string;
  status: QueueStatusProps;
  event?: QueueEventCardProps;
  tips: { title: string; items: QueueTip[] };
  /** Konfirmasi keluar dari antrian. */
  dialog?: ActionDialogProps;
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
  dialog,
}: QueueViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <PageHeader breadcrumb={breadcrumb} heading={heading} subtitle={subtitle} />

      <div className="mt-6 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <StatusCard {...status} />
        <aside className="flex flex-col gap-8">
          {event ? <EventSummaryCard {...event} /> : null}
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
      {dialog ? <ActionDialog {...dialog} /> : null}
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
  stale,
  notice,
  note,
  action,
  refresh,
  leave,
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
            <div
              data-stale={stale ? "true" : undefined}
              className={cn("flex flex-col items-center gap-3", stale && "opacity-60")}
            >
              <p className="type-title text-muted-foreground">{position.label}</p>
              <p className="type-h1 text-primary tabular-nums">{position.value}</p>
              <p className="type-title text-muted-foreground">{position.suffix}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6">
              {state === "loading" ? (
                <div aria-hidden="true" className="flex w-full flex-col items-center gap-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-14 w-48" />
                  <Skeleton className="h-5 w-56" />
                </div>
              ) : null}
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
            {notice ? (
              <Alert variant="warning" role="status">
                <InfoIcon />
                <AlertDescription className="type-body1 text-foreground">{notice}</AlertDescription>
              </Alert>
            ) : null}
            {refresh ? (
              <Button
                variant="outline"
                size="lg"
                className="self-center"
                onClick={refresh.onClick}
                disabled={refresh.disabled}
              >
                {refresh.label}
              </Button>
            ) : null}
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

        {leave ? (
          <Button
            variant="outline"
            size="lg"
            className="self-center border-primary text-primary hover:text-primary"
            onClick={leave.onClick}
          >
            {leave.label}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
