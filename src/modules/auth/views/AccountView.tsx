import Link from "next/link";
import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import {
  IdCardIcon,
  InfoIcon,
  LogOutIcon,
  PencilIcon,
  PlusIcon,
  TicketIcon,
  Trash2Icon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/components/ui/cn.utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader, type PageHeaderProps } from "@/components/ui/layout/PageHeader";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";
import { ActionDialog, type ActionDialogProps } from "@/components/ui/layout/ActionDialog";

type TextField = {
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Berubah saat field perlu difokus lagi, misalnya setelah "Ubah data" di modal NIK. */
  focusKey?: number;
  onChange: (value: string) => void;
};

type Action = { text: string; label: string; onClick: () => void };

export type AliasFormProps = {
  id: string;
  title: string;
  label: TextField;
  nik: TextField;
  submit: { label: string; disabled: boolean; onSubmit: () => void };
  cancel?: { label: string; onClick: () => void };
};

export type SavedNikItem = {
  id: string;
  label: string;
  /** Huruf awal nama alias untuk avatar. */
  initials: string;
  nikMasked: string;
  /** Teks tombol terlihat di `text`; nama alias ada di `label` (aria-label). */
  edit: Action;
  remove: Action;
  /** Ada saat alias ini sedang diubah. */
  form?: AliasFormProps;
};

export type AccountViewProps = Omit<SiteShellProps, "children"> & { header: PageHeaderProps } & (
    | { kind: "loading"; message: string }
    | { kind: "signedOut"; title: string; message: string; login: { label: string; href: string } }
    | {
        kind: "ready";
        profile: {
          title: string;
          name: string;
          initials: string;
          email: string;
          fields: { label: string; value: string }[];
          tickets: { label: string; href: string };
        };
        saved: {
          title: string;
          count: string;
          hint: string;
          emptyTitle: string;
          emptyLabel: string;
          items: SavedNikItem[];
          error?: string;
          busy: boolean;
        };
        /** Tidak ada saat daftar penuh atau saat alias lain sedang diubah. */
        add?: AliasFormProps;
        fullNotice?: string;
        notice: string;
        /** Modal verifikasi NIK saat menyimpan alias. */
        dialog?: ActionDialogProps;
        confirmRemove?: {
          title: string;
          description: string;
          confirm: { label: string; onClick: () => void };
          cancel: { label: string; onClick: () => void };
          busy: boolean;
        };
        signOut: { label: string; disabled: boolean; onClick: () => void };
      }
  );

type ReadyProps = Extract<AccountViewProps, { kind: "ready" }>;

export function AccountView(props: AccountViewProps) {
  const { nav, footer, header } = props;
  return (
    <SiteShell nav={nav} footer={footer}>
      <PageHeader {...header} />
      <div className="mt-6 sm:mt-8">
        <AccountBody {...props} />
      </div>
    </SiteShell>
  );
}

function AccountBody(props: AccountViewProps) {
  if (props.kind === "loading") {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex items-center gap-3 p-6">
          <Spinner className="text-primary" />
          <p role="status" className="type-body1 text-muted-foreground">
            {props.message}
          </p>
        </CardContent>
      </Card>
    );
  }
  if (props.kind === "signedOut") {
    return (
      <Card className="mx-auto max-w-xl rounded-2xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRoundIcon aria-hidden="true" className="size-7" />
          </span>
          <h2 className="type-h5">{props.title}</h2>
          <p className="type-body1 text-muted-foreground">{props.message}</p>
          <Link href={props.login.href} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            {props.login.label}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8">
      <ProfileCard profile={props.profile} signOut={props.signOut} />
      <div className="flex min-w-0 flex-col gap-6">
        <AliasesCard {...props} />
        <Alert variant="info" role="note" className="border-signal-info">
          <InfoIcon />
          <AlertDescription className="text-foreground">{props.notice}</AlertDescription>
        </Alert>
      </div>
      {props.confirmRemove ? <ConfirmRemoveDialog {...props.confirmRemove} /> : null}
      {props.dialog ? <ActionDialog {...props.dialog} /> : null}
    </div>
  );
}

function SectionTitle({
  icon,
  children,
  trailing,
}: {
  icon: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="type-h5 flex items-center gap-2">
        {icon}
        {children}
      </h2>
      {trailing}
    </div>
  );
}

function ProfileCard({ profile, signOut }: Pick<ReadyProps, "profile" | "signOut">) {
  return (
    <Card className="gap-0 self-start overflow-hidden rounded-2xl py-0 lg:sticky lg:top-24">
      <div className="flex flex-col items-center gap-3 bg-signal-disable px-6 pt-8 pb-6 text-center">
        <span
          aria-hidden="true"
          className="type-h4 flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
        >
          {profile.initials}
        </span>
        <div className="min-w-0">
          <p className="type-h6 truncate">{profile.name}</p>
          <p className="type-body2 truncate text-muted-foreground">{profile.email}</p>
        </div>
      </div>
      <CardContent className="flex flex-col gap-5 p-6">
        <section aria-labelledby="profile-title" className="flex flex-col gap-3">
          <h2 id="profile-title" className="type-body1 flex items-center gap-2 font-semibold">
            <IdCardIcon aria-hidden="true" className="size-4 text-primary" />
            {profile.title}
          </h2>
          <dl className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {profile.fields.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="type-body2 text-muted-foreground">{item.label}</dt>
                <dd className="type-body2 text-right font-medium break-all tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="flex flex-col gap-2">
          <Link href={profile.tickets.href} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            <TicketIcon data-icon="inline-start" />
            {profile.tickets.label}
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            disabled={signOut.disabled}
            onClick={signOut.onClick}
          >
            <LogOutIcon data-icon="inline-start" />
            {signOut.label}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AliasesCard({ saved, add, fullNotice }: ReadyProps) {
  return (
    <Card className="gap-0 rounded-2xl py-0">
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
        <section aria-labelledby="saved-niks-title" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <SectionTitle
              icon={<UsersRoundIcon aria-hidden="true" className="size-5 text-primary" />}
              trailing={
                <span className="type-body2 rounded-full bg-signal-disable px-3 py-1 font-medium tabular-nums">
                  {saved.count}
                </span>
              }
            >
              <span id="saved-niks-title">{saved.title}</span>
            </SectionTitle>
            <p className="type-body2 text-muted-foreground">{saved.hint}</p>
          </div>

          {saved.error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{saved.error}</AlertDescription>
            </Alert>
          ) : null}

          {saved.items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-8 text-center">
              <UsersRoundIcon aria-hidden="true" className="size-8 text-muted-foreground" />
              <p className="type-body1 font-semibold">{saved.emptyTitle}</p>
              <p className="type-body2 text-muted-foreground">{saved.emptyLabel}</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {saved.items.map((item) =>
                item.form ? (
                  <li key={item.id} className="sm:col-span-2">
                    <AliasForm {...item.form} />
                  </li>
                ) : (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/40"
                  >
                    <span
                      aria-hidden="true"
                      className="type-body1 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
                    >
                      {item.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="type-body1 truncate font-semibold">{item.label}</p>
                      <p className="type-body2 tabular-nums text-muted-foreground">{item.nikMasked}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={saved.busy}
                        onClick={item.edit.onClick}
                        aria-label={item.edit.label}
                        title={item.edit.text}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={saved.busy}
                        onClick={item.remove.onClick}
                        aria-label={item.remove.label}
                        title={item.remove.text}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}

          {fullNotice ? (
            <Alert variant="info">
              <InfoIcon />
              <AlertDescription>{fullNotice}</AlertDescription>
            </Alert>
          ) : null}
          {add ? <AliasForm {...add} /> : null}
        </section>
      </CardContent>
    </Card>
  );
}

function ConfirmRemoveDialog({
  title,
  description,
  confirm,
  cancel,
  busy,
}: NonNullable<ReadyProps["confirmRemove"]>) {
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && cancel.onClick()}>
      <DialogContent showCloseButton={!busy} aria-busy={busy}>
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-full bg-signal-bg-error text-signal-error [&_svg]:size-5"
        >
          <Trash2Icon />
        </span>
        <DialogHeader className="gap-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="lg" disabled={busy} onClick={cancel.onClick}>
            {cancel.label}
          </Button>
          <Button size="lg" disabled={busy} aria-busy={busy} onClick={confirm.onClick}>
            {busy ? <Spinner data-icon="inline-start" /> : null}
            {confirm.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AliasForm({ id, title, label, nik, submit, cancel }: AliasFormProps) {
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit.onSubmit();
  };
  return (
    <form
      noValidate
      aria-labelledby={`${id}-title`}
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-signal-disable/40 p-4 sm:p-5"
    >
      <h3 id={`${id}-title`} className="type-body1 flex items-center gap-2 font-semibold">
        {cancel ? (
          <PencilIcon aria-hidden="true" className="size-4 text-primary" />
        ) : (
          <PlusIcon aria-hidden="true" className="size-4 text-primary" />
        )}
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput id={`${id}-label`} field={label} autoComplete="off" />
        <TextInput id={`${id}-nik`} field={nik} inputMode="numeric" autoComplete="off" maxLength={16} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {cancel ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={submit.disabled}
            onClick={cancel.onClick}
          >
            {cancel.label}
          </Button>
        ) : null}
        <Button type="submit" size="lg" disabled={submit.disabled} aria-busy={submit.disabled}>
          {submit.disabled ? <Spinner data-icon="inline-start" /> : null}
          {submit.label}
        </Button>
      </div>
    </form>
  );
}

function TextInput({
  id,
  field,
  ...input
}: {
  id: string;
  field: TextField;
  inputMode?: "numeric";
  autoComplete?: string;
  maxLength?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (field.focusKey !== undefined) ref.current?.focus();
  }, [field.focusKey]);
  let describedBy: string | undefined;
  if (field.error) describedBy = `${id}-error`;
  else if (field.hint) describedBy = `${id}-hint`;
  return (
    <Field data-invalid={Boolean(field.error)}>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      <Input
        ref={ref}
        id={id}
        value={field.value}
        placeholder={field.placeholder}
        className="bg-background"
        aria-invalid={Boolean(field.error)}
        aria-describedby={describedBy}
        onChange={(event) => field.onChange(event.target.value)}
        {...input}
      />
      {field.error ? <FieldError id={`${id}-error`}>{field.error}</FieldError> : null}
      {!field.error && field.hint ? (
        <FieldDescription id={`${id}-hint`}>{field.hint}</FieldDescription>
      ) : null}
    </Field>
  );
}
