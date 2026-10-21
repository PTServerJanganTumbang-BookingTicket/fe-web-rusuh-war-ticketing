import { cn } from "../lib/cn";

export type CountdownCardProps = {
  heading: string;
  value: string;
  hint: string;
  /** Sisa waktu kritis (≤ 60 detik): nilai menjadi merah dan peringatan diumumkan assertive. */
  urgent: boolean;
  urgentMessage: string;
};

export function CountdownCard({ heading, value, hint, urgent, urgentMessage }: CountdownCardProps) {
  return (
    <section className="rounded-xl bg-signal-disable p-5 text-center">
      <p className="type-body1 text-muted-foreground">{heading}</p>
      <p role="timer" aria-live="off" className={cn("type-h2 my-1", urgent ? "text-signal-error" : "text-foreground")}>
        {value}
      </p>
      <p className="type-body1 text-muted-foreground">{hint}</p>
      <p role="status" aria-live="assertive" className="type-body2-bold mt-1 text-signal-error">
        {urgent ? urgentMessage : ""}
      </p>
    </section>
  );
}
