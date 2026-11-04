import Link from "next/link";
import type { FormEvent } from "react";
import { ScreenFrame } from "@/components/ui/layout/ScreenFrame";
import { Alert, Button, Card, CardContent } from "@/components/ui/primitives";
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

type TextField = {
  label: string;
  value: string;
  hint?: string;
  error?: string;
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
  nikMasked: string;
  /** Teks tombol terlihat di `text`; nama alias ada di `label` (aria-label). */
  edit: Action;
  remove: Action;
  /** Ada saat alias ini sedang diubah. */
  form?: AliasFormProps;
};

export type AccountViewProps = { title: string } & (
  | { kind: "loading"; message: string }
  | { kind: "signedOut"; message: string; login: { label: string; href: string } }
  | {
      kind: "ready";
      profile: {
        title: string;
        fields: { label: string; value: string }[];
        tickets: { label: string; href: string };
      };
      saved: {
        title: string;
        hint: string;
        emptyLabel: string;
        items: SavedNikItem[];
        error?: string;
        busy: boolean;
      };
      /** Tidak ada saat daftar penuh atau saat alias lain sedang diubah. */
      add?: AliasFormProps;
      fullNotice?: string;
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

export function AccountView(props: AccountViewProps) {
  if (props.kind === "loading") {
    return (
      <ScreenFrame title={props.title}>
        <p role="status" className="type-body1 text-muted-foreground">
          {props.message}
        </p>
      </ScreenFrame>
    );
  }
  if (props.kind === "signedOut") {
    return (
      <ScreenFrame title={props.title}>
        <p className="type-body1">{props.message}</p>
        <Button asChild size="lg">
          <Link href={props.login.href}>{props.login.label}</Link>
        </Button>
      </ScreenFrame>
    );
  }

  const { profile, saved, add, fullNotice, confirmRemove, signOut } = props;
  return (
    <ScreenFrame title={props.title}>
      <section aria-labelledby="profile-title" className="flex flex-col gap-3">
        <h2 id="profile-title" className="type-title-bold">
          {profile.title}
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {profile.fields.map((item) => (
            <div key={item.label} className="contents">
              <dt className="type-body2 text-muted-foreground">{item.label}</dt>
              <dd className="type-body1 break-all tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
        <Button asChild variant="outline">
          <Link href={profile.tickets.href}>{profile.tickets.label}</Link>
        </Button>
      </section>

      <section aria-labelledby="saved-niks-title" className="flex flex-col gap-3">
        <div>
          <h2 id="saved-niks-title" className="type-title-bold">
            {saved.title}
          </h2>
          <p className="type-body2 text-muted-foreground">{saved.hint}</p>
        </div>
        {saved.error ? (
          <Alert variant="error" role="alert">
            {saved.error}
          </Alert>
        ) : null}
        {saved.items.length === 0 ? (
          <p className="type-body2 text-muted-foreground">{saved.emptyLabel}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {saved.items.map((item) => (
              <li key={item.id}>
                {item.form ? (
                  <AliasForm {...item.form} />
                ) : (
                  <Card>
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="type-body1 truncate font-semibold">{item.label}</p>
                        <p className="type-body2 tabular-nums text-muted-foreground">{item.nikMasked}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={saved.busy}
                          onClick={item.edit.onClick}
                          aria-label={item.edit.label}
                        >
                          {item.edit.text}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={saved.busy}
                          onClick={item.remove.onClick}
                          aria-label={item.remove.label}
                        >
                          {item.remove.text}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </li>
            ))}
          </ul>
        )}
        {fullNotice ? <Alert variant="info">{fullNotice}</Alert> : null}
        {add ? <AliasForm {...add} /> : null}
      </section>

      <Button variant="outline" size="lg" disabled={signOut.disabled} onClick={signOut.onClick}>
        {signOut.label}
      </Button>

      {confirmRemove ? <ConfirmRemoveDialog {...confirmRemove} /> : null}
    </ScreenFrame>
  );
}

function ConfirmRemoveDialog({
  title,
  description,
  confirm,
  cancel,
  busy,
}: NonNullable<Extract<AccountViewProps, { kind: "ready" }>["confirmRemove"]>) {
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && cancel.onClick()}>
      <DialogContent showCloseButton={!busy} aria-busy={busy}>
        <DialogHeader className="gap-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={cancel.onClick}>
            {cancel.label}
          </Button>
          <Button variant="destructive" disabled={busy} aria-busy={busy} onClick={confirm.onClick}>
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
      className="flex flex-col gap-3 rounded-lg border border-input p-4"
    >
      <h3 id={`${id}-title`} className="type-body1 font-semibold">
        {title}
      </h3>
      <TextInput id={`${id}-label`} field={label} autoComplete="off" />
      <TextInput id={`${id}-nik`} field={nik} inputMode="numeric" autoComplete="off" maxLength={16} />
      <div className="flex gap-2">
        <Button type="submit" disabled={submit.disabled}>
          {submit.label}
        </Button>
        {cancel ? (
          <Button type="button" variant="ghost" disabled={submit.disabled} onClick={cancel.onClick}>
            {cancel.label}
          </Button>
        ) : null}
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
  let describedBy: string | undefined;
  if (field.error) describedBy = `${id}-error`;
  else if (field.hint) describedBy = `${id}-hint`;
  return (
    <Field data-invalid={Boolean(field.error)}>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      <Input
        id={id}
        value={field.value}
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
