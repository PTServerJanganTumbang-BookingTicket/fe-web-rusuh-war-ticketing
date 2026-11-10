import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { ArrowRightIcon, IdCardIcon, InfoIcon } from "@/components/ui/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ActionDialog, type ActionDialogProps } from "@/components/ui/layout/ActionDialog";
import { CategoryRow, type CategoryRowProps } from "./CategoryRow";

export type TextFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  /** Pesan positif, misalnya NIK terverifikasi. */
  success?: string;
  error?: string;
  /** NIK dari alias: tampil tersamar dan tidak bisa diketik. */
  readOnly?: boolean;
  /** Berubah saat field perlu difokus lagi, misalnya setelah "Ubah data" di modal NIK. */
  focusKey?: number;
  /** Batas panjang isian; karakter berlebih ditolak peramban. */
  maxLength?: number;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

export type HolderSourceProps = {
  label: string;
  /** Id alias terpilih; kosong berarti isian manual. */
  value: string;
  options: { value: string; label: string; disabled: boolean }[];
  hint: string;
  onChange: (value: string) => void;
};

export type TicketHolderProps = {
  id: string;
  /** Hanya ada pada tiket pertama tiap kategori: kategori yang sama dikelompokkan, bukan diulang per tiket. */
  heading?: { title: string; priceLabel: string };
  nik: TextFieldProps;
  /** Pilihan alias; hanya ada untuk customer yang masuk dan punya alias. */
  holder?: HolderSourceProps;
};

/** Tiket berurutan sekategori jadi satu kelompok; kelompok baru dimulai di tiket yang punya `heading`. */
function groupHolders(items: readonly TicketHolderProps[]): TicketHolderProps[][] {
  const groups: TicketHolderProps[][] = [];
  for (const item of items) {
    if (item.heading || groups.length === 0) groups.push([item]);
    else groups[groups.length - 1]!.push(item);
  }
  return groups;
}

export type BookingViewProps = Omit<SiteShellProps, "children"> & {
  header: PageHeaderProps;
  countdown: CountdownBannerProps;
  error?: string;
  dialog?: ActionDialogProps;
  buyer: { title: string; email: TextFieldProps; hint: string };
  categories: { title: string; limit: string; items: CategoryRowProps[] };
  holders?: { title: string; hint: string; items: TicketHolderProps[]; footnote: string };
  event?: EventSummaryCardProps;
  summary: {
    title: string;
    lines: OrderLine[];
    emptyLabel: string;
    totalLabel: string;
    total: string;
    footnote: string;
  };
  submit: { label: string; busy: boolean; disabled: boolean; onSubmit: () => void };
  notice: string;
};

function TextInput({
  id,
  field,
  inputMode,
  autoComplete,
}: {
  id: string;
  field: TextFieldProps;
  inputMode?: "numeric" | "email";
  autoComplete?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (field.focusKey !== undefined) ref.current?.focus();
  }, [field.focusKey]);
  let describedBy: string | undefined;
  if (field.error) describedBy = `${id}-error`;
  else if (field.success || field.hint) describedBy = `${id}-hint`;
  return (
    <Field data-invalid={Boolean(field.error)}>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      <Input
        ref={ref}
        id={id}
        value={field.value}
        placeholder={field.placeholder}
        readOnly={field.readOnly}
        className={field.readOnly ? "bg-signal-disable" : undefined}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={field.maxLength}
        aria-invalid={Boolean(field.error)}
        aria-describedby={describedBy}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
      />
      {field.error ? <FieldError id={`${id}-error`}>{field.error}</FieldError> : null}
      {!field.error && field.success ? (
        <FieldDescription id={`${id}-hint`} className="text-signal-valid">
          {field.success}
        </FieldDescription>
      ) : null}
      {!field.error && !field.success && field.hint ? (
        <FieldDescription id={`${id}-hint`}>{field.hint}</FieldDescription>
      ) : null}
    </Field>
  );
}

function HolderSourceSelect({ id, source }: { id: string; source: HolderSourceProps }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{source.label}</FieldLabel>
      <Select
        value={source.value}
        onValueChange={(next) => next != null && source.onChange(next)}
        items={source.options.map((option) => ({ value: option.value, label: option.label }))}
      >
        <SelectTrigger id={id} aria-describedby={`${id}-hint`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {source.options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription id={`${id}-hint`}>{source.hint}</FieldDescription>
    </Field>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-0 rounded-2xl py-0">
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="type-h5 flex items-center gap-2">
          <IdCardIcon aria-hidden="true" className="size-5 text-primary" />
          {title}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}

export function BookingView(props: BookingViewProps) {
  const {
    nav,
    footer,
    header,
    countdown,
    error,
    dialog,
    buyer,
    categories,
    holders,
    event,
    summary,
    submit,
    notice,
  } = props;
  const onSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    submit.onSubmit();
  };
  const submitButton = (
    <Button
      type="submit"
      form="booking-form"
      size="lg"
      className="w-full"
      disabled={submit.disabled}
      aria-busy={submit.busy}
    >
      {submit.busy ? <Spinner data-icon="inline-start" /> : null}
      {submit.label}
      {submit.busy ? null : <ArrowRightIcon data-icon="inline-end" />}
    </Button>
  );

  return (
    <SiteShell nav={nav} footer={footer}>
      <PageHeader {...header} />
      {/* Timer di luar grid supaya tetap menempel sampai bawah halaman, juga saat kolom samping turun di mobile. */}
      <div className="mt-6 flex flex-col gap-6 pb-24 sm:mt-8 lg:gap-8 lg:pb-0">
        <CountdownBanner {...countdown} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <form id="booking-form" noValidate onSubmit={onSubmit} className="flex min-w-0 flex-col gap-6">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <SectionCard title={buyer.title}>
              <TextInput id="buyer-email" field={buyer.email} inputMode="email" autoComplete="email" />
              <p className="type-body2 text-muted-foreground">{buyer.hint}</p>
            </SectionCard>

            <section aria-labelledby="categories-title" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="categories-title" className="type-h5">
                  {categories.title}
                </h2>
                <p className="type-body2 text-muted-foreground">{categories.limit}</p>
              </div>
              <ul className="flex flex-col gap-3">
                {categories.items.map((category) => (
                  <CategoryRow key={category.id} {...category} />
                ))}
              </ul>
            </section>

            {holders ? (
              <SectionCard title={holders.title}>
                <p className="type-body2 -mt-2 text-muted-foreground">{holders.hint}</p>
                <div className="flex flex-col gap-5">
                  {groupHolders(holders.items).map((group) => (
                    <section key={group[0]!.id} className="flex flex-col gap-3">
                      {group[0]!.heading ? (
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="type-body1-bold">{group[0]!.heading.title}</h3>
                          <p className="type-body2 text-muted-foreground tabular-nums">
                            {group[0]!.heading.priceLabel}
                          </p>
                        </div>
                      ) : null}
                      <ol className="flex flex-col gap-3">
                        {group.map((holder) => (
                          <li
                            key={holder.id}
                            className="flex flex-col gap-4 rounded-xl border border-border p-4"
                          >
                            {holder.holder ? (
                              <HolderSourceSelect id={`holder-${holder.id}`} source={holder.holder} />
                            ) : null}
                            <div>
                              <TextInput
                                id={`nik-${holder.id}`}
                                field={holder.nik}
                                inputMode="numeric"
                                autoComplete="off"
                              />
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
                <p className="type-body2 text-muted-foreground">{holders.footnote}</p>
              </SectionCard>
            ) : null}
          </form>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-44 lg:self-start">
            {event ? <EventSummaryCard {...event} /> : null}
            <OrderSummaryCard {...summary} action={<div className="hidden lg:block">{submitButton}</div>} />
            <Alert variant="info" role="note" className="border-signal-info">
              <InfoIcon />
              <AlertDescription className="text-foreground">{notice}</AlertDescription>
            </Alert>
          </aside>
        </div>
      </div>

      {/* Mobile: total dan tombol lanjut selalu terlihat di bawah layar. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="shrink-0">
            <p className="type-body2 text-muted-foreground">{summary.totalLabel}</p>
            <p className="type-h6 truncate text-primary tabular-nums">{summary.total}</p>
          </div>
          <div className="ml-auto min-w-0 flex-1 sm:max-w-xs">{submitButton}</div>
        </div>
      </div>
      {dialog ? <ActionDialog {...dialog} /> : null}
    </SiteShell>
  );
}
