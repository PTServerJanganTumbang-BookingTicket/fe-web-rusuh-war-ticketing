import { Button } from "@/core/views/design-system/primitives/Button";
import { Card } from "@/core/views/design-system/primitives/Card";
import { Progress } from "@/core/views/design-system/primitives/Progress";
import { ScreenFrame } from "@/core/views/design-system/layout/ScreenFrame";

export type QueueViewProps = {
  title: string;
  eventName?: string;
  state: "loading" | "waiting" | "admitted" | "error";
  /** Pesan untuk state selain waiting. */
  message?: string;
  position?: { label: string; value: string; suffix: string };
  eta?: { label: string; value: string };
  progress?: { percent: number; label: string };
  note?: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
};

export function QueueView({
  title,
  eventName,
  state,
  message,
  position,
  eta,
  progress,
  note,
  action,
}: QueueViewProps) {
  return (
    <ScreenFrame title={title} trailing={eventName}>
      {state === "waiting" && position ? (
        <>
          <section aria-live="polite" className="rounded-xl bg-signal-disable p-5 text-center">
            <p className="type-body1 text-muted-foreground">{position.label}</p>
            <p className="type-h1 my-1 text-primary">{position.value}</p>
            <p className="type-body1 text-muted-foreground">{position.suffix}</p>
          </section>
          {eta ? (
            <Card className="p-5 text-center">
              <p className="type-body1 text-muted-foreground">{eta.label}</p>
              <p className="type-h5 mt-1">{eta.value}</p>
            </Card>
          ) : null}
          {progress ? <Progress value={progress.percent} aria-label={progress.label} /> : null}
          {note ? <p className="type-body1 text-center text-muted-foreground">{note}</p> : null}
        </>
      ) : (
        <div aria-live="polite" className="flex flex-col items-center gap-4 py-4 text-center">
          <p className={state === "error" ? "type-body1 text-signal-error" : "type-body1"}>{message}</p>
          {action ? (
            <Button size="lg" onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </Button>
          ) : null}
        </div>
      )}
    </ScreenFrame>
  );
}
