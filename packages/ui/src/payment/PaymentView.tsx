import { Alert } from "../primitives/Alert";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";
import { RadioGroup, RadioGroupItem } from "../primitives/RadioGroup";
import { CountdownCard, type CountdownCardProps } from "../shared/CountdownCard";
import { ScreenFrame } from "../shared/ScreenFrame";
import { cn } from "../lib/cn";
import { FakeQr } from "./FakeQr";

export type PaymentInstructionView =
  | { type: "virtual_account"; label: string; number: string; copy: { label: string; onClick: () => void } }
  | { type: "qr"; seed: string; qrLabel: string; hint: string; fakeNote: string }
  | { type: "bank_transfer"; lines: string[] };

export type PaymentViewProps = {
  title: string;
  orderLabel: string;
  countdown: CountdownCardProps;
  total: { label: string; value: string };
  /** Tahap pemilihan metode. */
  methods?: {
    label: string;
    options: { id: string; label: string; selected: boolean; onSelect: () => void }[];
  };
  pay?: { label: string; disabled: boolean; onClick: () => void };
  /** Tahap menunggu pembayaran. */
  pending?: { heading: string; note: string; instruction: PaymentInstructionView };
  /** Hanya mode mock: pengganti notifikasi Midtrans. */
  mockControls?: {
    title: string;
    success: { label: string; onClick: () => void; disabled: boolean };
    fail: { label: string; onClick: () => void; disabled: boolean };
  };
};

function Instruction({ instruction }: { instruction: PaymentInstructionView }) {
  switch (instruction.type) {
    case "virtual_account":
      return (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="type-body1 text-muted-foreground">{instruction.label}</p>
          <p className="type-h4 tracking-wider">{instruction.number}</p>
          <Button variant="outline" onClick={instruction.copy.onClick}>
            {instruction.copy.label}
          </Button>
        </div>
      );
    case "qr":
      return (
        <div className="flex flex-col items-center gap-2 text-center">
          <FakeQr seed={instruction.seed} label={instruction.qrLabel} />
          <p className="type-body1">{instruction.hint}</p>
          <p className="type-body2 text-muted-foreground">{instruction.fakeNote}</p>
        </div>
      );
    case "bank_transfer":
      return (
        <div className="flex flex-col items-center gap-1 text-center">
          {instruction.lines.map((line) => (
            <p key={line} className="type-title-bold">
              {line}
            </p>
          ))}
        </div>
      );
  }
}

export function PaymentView(props: PaymentViewProps) {
  const methods = props.methods;
  return (
    <ScreenFrame title={props.title} trailing={props.orderLabel}>
      <CountdownCard {...props.countdown} />

      {methods ? (
        <div className="flex flex-col gap-3">
          <h2 id="payment-method-label" className="type-body1 text-muted-foreground">
            {methods.label}
          </h2>
          <RadioGroup
            aria-labelledby="payment-method-label"
            value={methods.options.find((option) => option.selected)?.id}
            onValueChange={(id) => methods.options.find((option) => option.id === id)?.onSelect()}
          >
            {methods.options.map((option) => (
              <label
                key={option.id}
                htmlFor={`method-${option.id}`}
                className={cn(
                  "type-title-bold flex cursor-pointer items-center justify-between rounded-xl border p-4",
                  option.selected ? "border-primary bg-accent" : "bg-signal-disable",
                )}
              >
                {option.label}
                <RadioGroupItem id={`method-${option.id}`} value={option.id} />
              </label>
            ))}
          </RadioGroup>
        </div>
      ) : null}

      {props.pending ? (
        <Card aria-live="polite" className="flex flex-col gap-4 p-5">
          <h2 className="type-h6 text-center">{props.pending.heading}</h2>
          <Instruction instruction={props.pending.instruction} />
          <p className="type-body2 text-center text-muted-foreground">{props.pending.note}</p>
        </Card>
      ) : null}

      <div className="type-title-bold flex items-baseline justify-between">
        <span>{props.total.label}</span>
        <span>{props.total.value}</span>
      </div>

      {props.pay ? (
        <Button size="lg" className="w-fit" onClick={props.pay.onClick} disabled={props.pay.disabled}>
          {props.pay.label}
        </Button>
      ) : null}

      {props.mockControls ? (
        <Alert variant="warning" className="flex flex-col gap-2">
          <h2 className="type-body2-bold">{props.mockControls.title}</h2>
          <div className="flex gap-2">
            <Button variant="success" className="flex-1" onClick={props.mockControls.success.onClick} disabled={props.mockControls.success.disabled}>
              {props.mockControls.success.label}
            </Button>
            <Button variant="destructive" className="flex-1" onClick={props.mockControls.fail.onClick} disabled={props.mockControls.fail.disabled}>
              {props.mockControls.fail.label}
            </Button>
          </div>
        </Alert>
      ) : null}
    </ScreenFrame>
  );
}
