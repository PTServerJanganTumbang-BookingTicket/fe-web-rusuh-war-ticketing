import { Button } from "@/ui/design-system/primitives/Button";
import { Card } from "@/ui/design-system/primitives/Card";
import { ScreenFrame } from "@/ui/design-system/layout/ScreenFrame";

export type PaymentResultViewProps = {
  tone: "success" | "danger";
  headerLabel: string;
  orderLabel: string;
  title: string;
  message: string;
  /** Ringkasan e-tiket, hanya untuk pembayaran berhasil. */
  ticket?: string;
  cta: { label: string; onClick: () => void };
};

export function PaymentResultView({
  tone,
  headerLabel,
  orderLabel,
  title,
  message,
  ticket,
  cta,
}: PaymentResultViewProps) {
  return (
    <ScreenFrame title={headerLabel} tone={tone} trailing={orderLabel}>
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 text-center">
        <h2 className="type-h5">{title}</h2>
        <p className="type-body1 text-muted-foreground">{message}</p>
        {ticket ? <Card className="type-title w-full bg-signal-disable p-4">{ticket}</Card> : null}
        <Button variant="outline" size="lg" className="mt-2" onClick={cta.onClick}>
          {cta.label}
        </Button>
      </div>
    </ScreenFrame>
  );
}
