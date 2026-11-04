import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CopyIcon,
  LandmarkIcon,
  ShieldCheckIcon,
  TimerOffIcon,
  WalletIcon,
  ZapIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/components/ui/cn.utils";
import { Spinner } from "@/components/ui/spinner";
import {
  CountdownBanner,
  EventSummaryCard,
  OrderSummaryCard,
  type CountdownBannerProps,
  type EventSummaryCardProps,
  type OrderLine,
} from "@/components/ui/layout/CheckoutCards";
import { PageHeader, type PageHeaderProps } from "@/components/ui/layout/PageHeader";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";
import { FakeQr } from "./FakeQr";

type LinkProps = { label: string; href: string };
type ActionProps = { label: string; onClick: () => void; disabled?: boolean };

export type PaymentMethodOption = {
  id: string;
  icon: "bank" | "wallet";
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
};

export type BankOption = { code: string; name: string; selected: boolean; onSelect: () => void };

export type PaymentInstructionView =
  | { type: "virtual_account"; label: string; number: string; copy: ActionProps }
  | { type: "qr"; seed: string; qrLabel: string; hint: string; fakeNote: string; openApp?: LinkProps };

export type PaymentStage =
  | {
      kind: "select";
      title: string;
      failedNotice?: string;
      methods: PaymentMethodOption[];
      banks?: { label: string; error?: string; options: BankOption[] };
      note?: string;
    }
  | {
      kind: "pending";
      title: string;
      note: string;
      instruction: PaymentInstructionView;
      mock?: { title: string; success: ActionProps; fail: ActionProps };
    }
  | {
      kind: "result";
      tone: "success" | "error" | "warning";
      title: string;
      message: string;
      detail?: string;
      primary: LinkProps;
      secondary?: LinkProps;
    };

export type PaymentViewProps = Omit<SiteShellProps, "children"> & {
  header: PageHeaderProps;
  order: { label: string; status: { label: string; tone: "warning" | "success" | "error" } };
  countdown?: CountdownBannerProps;
  error?: string;
  stage: PaymentStage;
  secure: { title: string; body: string };
  event?: EventSummaryCardProps;
  summary: { title: string; lines: OrderLine[]; totalLabel: string; total: string; footnote: string };
  /** Hanya di tahap pilih metode. */
  pay?: { label: string; busy: boolean; disabled: boolean; onClick: () => void };
  terms?: string;
};

// Kelas ditulis utuh supaya terdeteksi Tailwind.
const statusTone = {
  warning: "bg-signal-bg-warning text-signal-warning",
  success: "bg-signal-bg-valid text-signal-valid",
  error: "bg-signal-bg-error text-signal-error",
};
const resultTone = {
  success: { bubble: "bg-signal-bg-valid text-signal-valid", icon: CircleCheckIcon },
  error: { bubble: "bg-signal-bg-error text-signal-error", icon: CircleAlertIcon },
  warning: { bubble: "bg-signal-bg-warning text-signal-warning", icon: TimerOffIcon },
};
const methodIcons = { bank: LandmarkIcon, wallet: WalletIcon };

function StageCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-0 rounded-2xl py-0">
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="type-h5">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

function MethodSelection({ stage }: { stage: Extract<PaymentStage, { kind: "select" }> }) {
  return (
    <StageCard title={stage.title}>
      {stage.failedNotice ? (
        <Alert variant="destructive">
          <AlertDescription>{stage.failedNotice}</AlertDescription>
        </Alert>
      ) : null}
      <div role="radiogroup" aria-label={stage.title} className="flex flex-col gap-3">
        {stage.methods.map((method) => {
          const Icon = methodIcons[method.icon];
          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={method.selected}
              disabled={method.disabled}
              onClick={method.onSelect}
              className={cn(
                "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 sm:p-5",
                method.selected ? "border-primary bg-signal-bg-info" : "border-border hover:bg-accent",
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-sm"
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="type-title block text-foreground">{method.title}</span>
                <span className="type-body2 block text-muted-foreground">{method.description}</span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "size-5 shrink-0 rounded-full border-2",
                  method.selected ? "border-[6px] border-primary" : "border-input",
                )}
              />
            </button>
          );
        })}
      </div>

      {stage.banks ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="type-body1-bold mb-2">{stage.banks.label}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stage.banks.options.map((bank) => (
              <button
                key={bank.code}
                type="button"
                aria-pressed={bank.selected}
                onClick={bank.onSelect}
                className={cn(
                  "type-body1-bold h-11 rounded-lg border outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  bank.selected
                    ? "border-primary bg-brand-tint text-primary"
                    : "border-border hover:bg-accent",
                )}
              >
                {bank.name}
              </button>
            ))}
          </div>
          {stage.banks.error ? (
            <p role="alert" className="type-body2 text-signal-error">
              {stage.banks.error}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {stage.note ? (
        <p className="type-body2 flex items-start gap-2 text-muted-foreground">
          <ZapIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          {stage.note}
        </p>
      ) : null}
    </StageCard>
  );
}

function PendingPayment({ stage }: { stage: Extract<PaymentStage, { kind: "pending" }> }) {
  const { instruction } = stage;
  return (
    <StageCard title={stage.title}>
      {instruction.type === "virtual_account" ? (
        <div className="flex flex-col gap-3 rounded-xl bg-signal-disable p-4 sm:p-5">
          <p className="type-body2 text-muted-foreground">{instruction.label}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-h4 tracking-wider tabular-nums break-all">{instruction.number}</p>
            <Button variant="outline" onClick={instruction.copy.onClick}>
              <CopyIcon data-icon="inline-start" />
              {instruction.copy.label}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-signal-disable p-4 text-center sm:p-5">
          <FakeQr seed={instruction.seed} label={instruction.qrLabel} />
          <p className="type-body2 text-muted-foreground">{instruction.hint}</p>
          <p className="type-body2 text-muted-foreground">{instruction.fakeNote}</p>
          {instruction.openApp ? (
            <a
              href={instruction.openApp.href}
              className={cn(buttonVariants({ variant: "outline" }), "sm:hidden")}
            >
              {instruction.openApp.label}
            </a>
          ) : null}
        </div>
      )}
      <p role="status" className="type-body2 flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-4" />
        {stage.note}
      </p>
      {stage.mock ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4">
          <p className="type-body2 text-muted-foreground">{stage.mock.title}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={stage.mock.success.onClick} disabled={stage.mock.success.disabled}>
              {stage.mock.success.label}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={stage.mock.fail.onClick}
              disabled={stage.mock.fail.disabled}
            >
              {stage.mock.fail.label}
            </Button>
          </div>
        </div>
      ) : null}
    </StageCard>
  );
}

function PaymentResult({ stage }: { stage: Extract<PaymentStage, { kind: "result" }> }) {
  const tone = resultTone[stage.tone];
  const Icon = tone.icon;
  return (
    <Card className="gap-0 rounded-2xl py-0">
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:p-8">
        <span
          aria-hidden="true"
          className={cn("flex size-12 items-center justify-center rounded-full", tone.bubble)}
        >
          <Icon className="size-6" />
        </span>
        <div role="status" className="flex flex-col gap-1">
          <h2 className="type-h4">{stage.title}</h2>
          <p className="type-body1 text-muted-foreground">{stage.message}</p>
          {stage.detail ? <p className="type-body1-bold">{stage.detail}</p> : null}
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link href={stage.primary.href} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            {stage.primary.label}
          </Link>
          {stage.secondary ? (
            <Link
              href={stage.secondary.href}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "w-full border-primary text-primary sm:w-auto",
              )}
            >
              {stage.secondary.label}
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function PaymentView(props: PaymentViewProps) {
  const { nav, footer, header, order, countdown, error, stage, secure, event, summary, pay, terms } = props;
  const payButton = pay ? (
    <Button size="lg" className="w-full" disabled={pay.disabled} aria-busy={pay.busy} onClick={pay.onClick}>
      {pay.busy ? <Spinner data-icon="inline-start" /> : null}
      {pay.label}
      {pay.busy ? null : <ArrowRightIcon data-icon="inline-end" />}
    </Button>
  ) : null;

  return (
    <SiteShell nav={nav} footer={footer}>
      <PageHeader {...header} />
      {/* Timer di luar grid supaya tetap menempel sampai bawah halaman, juga saat kolom samping turun di mobile. */}
      <div
        className={cn("mt-6 flex flex-col gap-6 sm:mt-8 lg:gap-8", payButton ? "pb-24 lg:pb-0" : undefined)}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="type-body1 text-muted-foreground">{order.label}</p>
          <Badge
            className={cn(
              "type-body2 h-auto rounded-full px-3 py-1 uppercase",
              statusTone[order.status.tone],
            )}
          >
            {order.status.label}
          </Badge>
        </div>
        {countdown ? <CountdownBanner {...countdown} /> : null}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {stage.kind === "select" ? <MethodSelection stage={stage} /> : null}
            {stage.kind === "pending" ? <PendingPayment stage={stage} /> : null}
            {stage.kind === "result" ? <PaymentResult stage={stage} /> : null}
            <Alert variant="success" role="note" className="border-signal-valid">
              <ShieldCheckIcon />
              <AlertTitle className="text-foreground">{secure.title}</AlertTitle>
              <AlertDescription className="text-foreground">{secure.body}</AlertDescription>
            </Alert>
          </div>

          <aside
            className={cn(
              "flex flex-col gap-6 lg:sticky lg:self-start",
              countdown ? "lg:top-44" : "lg:top-24",
            )}
          >
            {event ? <EventSummaryCard {...event} /> : null}
            <OrderSummaryCard
              {...summary}
              action={payButton ? <div className="hidden lg:block">{payButton}</div> : undefined}
            />
            {terms ? <p className="type-body2 text-center text-muted-foreground">{terms}</p> : null}
          </aside>
        </div>
      </div>

      {payButton ? (
        // Mobile: total dan tombol bayar selalu terlihat di bawah layar.
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-4">
            <div className="shrink-0">
              <p className="type-body2 text-muted-foreground">{summary.totalLabel}</p>
              <p className="type-h6 truncate text-primary tabular-nums">{summary.total}</p>
            </div>
            <div className="ml-auto min-w-0 flex-1 sm:max-w-xs">{payButton}</div>
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}
