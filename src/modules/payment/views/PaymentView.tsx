"use client";

/**
 * @file PaymentView.tsx
 * @description Komponen utama halaman pembayaran dengan berbagai stage.
 * Mendukung: pemilihan metode (select), menunggu pembayaran (pending), dan hasil (result).
 */

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

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Props untuk link navigasi */
type LinkProps = {
  readonly label: string;
  readonly href: string;
};

/** Props untuk action button */
type ActionProps = {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
};

/** Opsi metode pembayaran yang tersedia */
export type PaymentMethodOption = {
  readonly id: string;
  readonly icon: "bank" | "wallet";
  readonly title: string;
  readonly description: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly onSelect: () => void;
};

/** Opsi bank untuk transfer */
export type BankOption = {
  readonly code: string;
  readonly name: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
};

/** Instruksi pembayaran - VA atau QR */
export type PaymentInstructionView =
  | {
      readonly type: "virtual_account";
      readonly label: string;
      readonly number: string;
      readonly copy: ActionProps;
    }
  | {
      readonly type: "qr";
      readonly seed: string;
      readonly qrLabel: string;
      readonly hint: string;
      readonly fakeNote: string;
      readonly openApp?: LinkProps;
    };

/** Stage select - pemilihan metode pembayaran */
type SelectStage = {
  readonly kind: "select";
  readonly title: string;
  readonly failedNotice?: string;
  readonly methods: readonly PaymentMethodOption[];
  readonly banks?: {
    readonly label: string;
    readonly error?: string;
    readonly options: readonly BankOption[];
  };
  readonly note?: string;
};

/** Stage pending - menunggu pembayaran */
type PendingStage = {
  readonly kind: "pending";
  readonly title: string;
  readonly note: string;
  readonly instruction: PaymentInstructionView;
  readonly mock?: {
    readonly title: string;
    readonly success: ActionProps;
    readonly fail: ActionProps;
  };
};

/** Stage result - hasil pembayaran */
type ResultStage = {
  readonly kind: "result";
  readonly tone: "success" | "error" | "warning";
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
  readonly primary: LinkProps;
  readonly secondary?: LinkProps;
};

/** Union type untuk semua payment stage */
export type PaymentStage = SelectStage | PendingStage | ResultStage;

/** Props utama untuk PaymentView */
export type PaymentViewProps = Omit<SiteShellProps, "children"> & {
  readonly header: PageHeaderProps;
  readonly order: {
    readonly label: string;
    readonly status: {
      readonly label: string;
      readonly tone: "warning" | "success" | "error";
    };
  };
  readonly countdown?: CountdownBannerProps;
  readonly error?: string;
  readonly stage: PaymentStage;
  readonly secure: {
    readonly title: string;
    readonly body: string;
  };
  readonly event?: EventSummaryCardProps;
  readonly summary: {
    readonly title: string;
    readonly lines: OrderLine[];
    readonly totalLabel: string;
    readonly total: string;
    readonly footnote: string;
  };
  readonly pay?: {
    readonly label: string;
    readonly busy: boolean;
    readonly disabled: boolean;
    readonly onClick: () => void;
  };
  readonly terms?: string;
};

/* ========================================================================== */
/*                                 Constants                                  */
/* ========================================================================== */

/** Mapping warna status order - ditulis lengkap untuk Tailwind detection */
const ORDER_STATUS_STYLES = {
  warning: "bg-signal-bg-warning text-signal-warning",
  success: "bg-signal-bg-valid text-signal-valid",
  error: "bg-signal-bg-error text-signal-error",
} as const;

/** Mapping icon dan style untuk result stage */
const RESULT_STAGE_STYLES = {
  success: {
    bubbleClass: "bg-signal-bg-valid text-signal-valid",
    IconComponent: CircleCheckIcon,
  },
  error: {
    bubbleClass: "bg-signal-bg-error text-signal-error",
    IconComponent: CircleAlertIcon,
  },
  warning: {
    bubbleClass: "bg-signal-bg-warning text-signal-warning",
    IconComponent: TimerOffIcon,
  },
} as const;

/** Mapping icon untuk metode pembayaran */
const PAYMENT_METHOD_ICONS = {
  bank: LandmarkIcon,
  wallet: WalletIcon,
} as const;

/* ========================================================================== */
/*                             Sub-components                                 */
/* ========================================================================== */

type StageCardProps = {
  readonly title: string;
  readonly children: ReactNode;
};

/** Card wrapper untuk setiap stage */
const StageCard = ({ title, children }: StageCardProps) => (
  <Card className="gap-0 rounded-2xl py-0">
    <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="type-h5">{title}</h2>
      {children}
    </CardContent>
  </Card>
);

type MethodSelectionProps = {
  readonly stage: SelectStage;
};

/** Komponen pemilihan metode pembayaran */
const MethodSelection = ({ stage }: MethodSelectionProps) => {
  const { title, failedNotice, methods, banks, note } = stage;

  return (
    <StageCard title={title}>
      {failedNotice != null && (
        <Alert variant="destructive">
          <AlertDescription>{failedNotice}</AlertDescription>
        </Alert>
      )}

      <div role="radiogroup" aria-label={title} className="flex flex-col gap-3">
        {methods.map((method) => {
          const IconComponent = PAYMENT_METHOD_ICONS[method.icon];
          const isSelected = method.selected;
          const buttonClasses = cn(
            "flex w-full items-center gap-4 rounded-xl border p-4 text-left",
            "transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-60 sm:p-5",
            isSelected ? "border-primary bg-signal-bg-info" : "border-border hover:bg-accent",
          );
          const radioClasses = cn(
            "size-5 shrink-0 rounded-full border-2",
            isSelected ? "border-[6px] border-primary" : "border-input",
          );

          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={method.disabled}
              onClick={method.onSelect}
              className={buttonClasses}
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-sm"
              >
                <IconComponent className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="type-title block text-foreground">{method.title}</span>
                <span className="type-body2 block text-muted-foreground">{method.description}</span>
              </span>
              <span aria-hidden="true" className={radioClasses} />
            </button>
          );
        })}
      </div>

      {banks != null && (
        <fieldset className="flex flex-col gap-2">
          <legend className="type-body1-bold mb-2">{banks.label}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {banks.options.map((bank) => {
              const bankButtonClasses = cn(
                "type-body1-bold h-11 rounded-lg border outline-none",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                bank.selected ? "border-primary bg-brand-tint text-primary" : "border-border hover:bg-accent",
              );

              return (
                <button
                  key={bank.code}
                  type="button"
                  aria-pressed={bank.selected}
                  onClick={bank.onSelect}
                  className={bankButtonClasses}
                >
                  {bank.name}
                </button>
              );
            })}
          </div>
          {banks.error != null && (
            <p role="alert" className="type-body2 text-signal-error">
              {banks.error}
            </p>
          )}
        </fieldset>
      )}

      {note != null && (
        <p className="type-body2 flex items-start gap-2 text-muted-foreground">
          <ZapIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          {note}
        </p>
      )}
    </StageCard>
  );
};

type PendingPaymentProps = {
  readonly stage: PendingStage;
};

/** Komponen tampilan menunggu pembayaran */
const PendingPayment = ({ stage }: PendingPaymentProps) => {
  const { title, instruction, note, mock } = stage;

  const renderVirtualAccount = () => {
    if (instruction.type !== "virtual_account") return null;

    return (
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
    );
  };

  const renderQrCode = () => {
    if (instruction.type !== "qr") return null;

    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-signal-disable p-4 text-center sm:p-5">
        <FakeQr seed={instruction.seed} label={instruction.qrLabel} />
        <p className="type-body2 text-muted-foreground">{instruction.hint}</p>
        <p className="type-body2 text-muted-foreground">{instruction.fakeNote}</p>
        {instruction.openApp != null && (
          <a
            href={instruction.openApp.href}
            className={cn(buttonVariants({ variant: "outline" }), "sm:hidden")}
          >
            {instruction.openApp.label}
          </a>
        )}
      </div>
    );
  };

  return (
    <StageCard title={title}>
      {instruction.type === "virtual_account" ? renderVirtualAccount() : renderQrCode()}

      <p role="status" className="type-body2 flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-4" />
        {note}
      </p>

      {mock != null && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4">
          <p className="type-body2 text-muted-foreground">{mock.title}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={mock.success.onClick} disabled={mock.success.disabled}>
              {mock.success.label}
            </Button>
            <Button size="sm" variant="outline" onClick={mock.fail.onClick} disabled={mock.fail.disabled}>
              {mock.fail.label}
            </Button>
          </div>
        </div>
      )}
    </StageCard>
  );
};

type PaymentResultProps = {
  readonly stage: ResultStage;
};

/** Komponen hasil pembayaran */
const PaymentResult = ({ stage }: PaymentResultProps) => {
  const { tone, title, message, detail, primary, secondary } = stage;
  const { bubbleClass, IconComponent } = RESULT_STAGE_STYLES[tone];

  return (
    <Card className="gap-0 rounded-2xl py-0">
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:p-8">
        <span
          aria-hidden="true"
          className={cn("flex size-12 items-center justify-center rounded-full", bubbleClass)}
        >
          <IconComponent className="size-6" />
        </span>

        <div role="status" className="flex flex-col gap-1">
          <h2 className="type-h4">{title}</h2>
          <p className="type-body1 text-muted-foreground">{message}</p>
          {detail != null && <p className="type-body1-bold">{detail}</p>}
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link href={primary.href} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            {primary.label}
          </Link>
          {secondary != null && (
            <Link
              href={secondary.href}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "w-full border-primary text-primary sm:w-auto",
              )}
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/* ========================================================================== */
/*                              Main Component                                */
/* ========================================================================== */

/**
 * PaymentView - komponen utama untuk halaman pembayaran.
 * Menampilkan header, countdown, stage pembayaran, dan ringkasan order.
 */
export const PaymentView = (props: PaymentViewProps) => {
  const { nav, footer, header, order, countdown, error, stage, secure, event, summary, pay, terms } = props;

  const renderPayButton = () => {
    if (pay == null) return null;

    return (
      <Button size="lg" className="w-full" disabled={pay.disabled} aria-busy={pay.busy} onClick={pay.onClick}>
        {pay.busy && <Spinner data-icon="inline-start" />}
        {pay.label}
        {!pay.busy && <ArrowRightIcon data-icon="inline-end" />}
      </Button>
    );
  };

  const payButton = renderPayButton();

  const renderCurrentStage = () => {
    switch (stage.kind) {
      case "select":
        return <MethodSelection stage={stage} />;
      case "pending":
        return <PendingPayment stage={stage} />;
      case "result":
        return <PaymentResult stage={stage} />;
    }
  };

  const mainContentClasses = cn(
    "mt-6 flex flex-col gap-6 sm:mt-8 lg:gap-8",
    payButton != null ? "pb-24 lg:pb-0" : undefined,
  );

  const asideClasses = cn(
    "flex flex-col gap-6 lg:sticky lg:self-start",
    countdown != null ? "lg:top-44" : "lg:top-24",
  );

  return (
    <SiteShell nav={nav} footer={footer}>
      <PageHeader {...header} />

      <div className={mainContentClasses}>
        {/* Order status header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="type-body1 text-muted-foreground">{order.label}</p>
          <Badge
            className={cn(
              "type-body2 h-auto rounded-full px-3 py-1 uppercase",
              ORDER_STATUS_STYLES[order.status.tone],
            )}
          >
            {order.status.label}
          </Badge>
        </div>

        {/* Countdown banner */}
        {countdown != null && <CountdownBanner {...countdown} />}

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          {/* Left column - payment stage */}
          <div className="flex min-w-0 flex-col gap-6">
            {error != null && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {renderCurrentStage()}

            <Alert variant="success" role="note" className="border-signal-valid">
              <ShieldCheckIcon />
              <AlertTitle className="text-foreground">{secure.title}</AlertTitle>
              <AlertDescription className="text-foreground">{secure.body}</AlertDescription>
            </Alert>
          </div>

          {/* Right column - event and order summary */}
          <aside className={asideClasses}>
            {event != null && <EventSummaryCard {...event} />}
            <OrderSummaryCard
              {...summary}
              action={payButton != null ? <div className="hidden lg:block">{payButton}</div> : undefined}
            />
            {terms != null && <p className="type-body2 text-center text-muted-foreground">{terms}</p>}
          </aside>
        </div>
      </div>

      {/* Mobile fixed pay button */}
      {payButton != null && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-4">
            <div className="shrink-0">
              <p className="type-body2 text-muted-foreground">{summary.totalLabel}</p>
              <p className="type-h6 truncate text-primary tabular-nums">{summary.total}</p>
            </div>
            <div className="ml-auto min-w-0 flex-1 sm:max-w-xs">{payButton}</div>
          </div>
        </div>
      )}
    </SiteShell>
  );
};
