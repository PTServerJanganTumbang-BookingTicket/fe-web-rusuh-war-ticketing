import Link from "next/link";
import type { FormEvent } from "react";
import { ScreenFrame } from "@/components/ui/layout/ScreenFrame";
import { Alert, Button, Card, CardContent } from "@/components/ui/primitives";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type TextField = { label: string; value: string; error?: string; onChange: (value: string) => void };

export type SavedNikItem = {
  id: string;
  label: string;
  nikMasked: string;
  removeLabel: string;
  onRemove: () => void;
};

export type AccountViewProps = { title: string } & (
  | { kind: "loading"; message: string }
  | { kind: "signedOut"; message: string; login: { label: string; href: string } }
  | {
      kind: "ready";
      profile: { emailLabel: string; email: string; nikLabel: string; nikMasked: string };
      saved: {
        title: string;
        hint: string;
        emptyLabel: string;
        /** Teks tombol hapus yang terlihat; nama NIK ada di `aria-label` tiap item. */
        removeText: string;
        items: SavedNikItem[];
        error?: string;
        busy: boolean;
      };
      /** Tidak ada saat daftar penuh; `fullNotice` menggantikannya. */
      add?: {
        title: string;
        label: TextField;
        nik: TextField;
        submit: { label: string; disabled: boolean; onSubmit: () => void };
      };
      fullNotice?: string;
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

  const { profile, saved, add, fullNotice, signOut } = props;
  return (
    <ScreenFrame title={props.title}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="type-body2 text-muted-foreground">{profile.emailLabel}</dt>
        <dd className="type-body1 break-all">{profile.email}</dd>
        <dt className="type-body2 text-muted-foreground">{profile.nikLabel}</dt>
        <dd className="type-body1 tabular-nums">{profile.nikMasked}</dd>
      </dl>

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
                <Card>
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="type-body1 font-semibold">{item.label}</p>
                      <p className="type-body2 tabular-nums text-muted-foreground">{item.nikMasked}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={saved.busy}
                      onClick={item.onRemove}
                      aria-label={item.removeLabel}
                    >
                      {saved.removeText}
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
        {fullNotice ? <Alert variant="info">{fullNotice}</Alert> : null}
        {add ? <AddSavedNikForm {...add} /> : null}
      </section>

      <Button variant="outline" size="lg" disabled={signOut.disabled} onClick={signOut.onClick}>
        {signOut.label}
      </Button>
    </ScreenFrame>
  );
}

function AddSavedNikForm({
  title,
  label,
  nik,
  submit,
}: NonNullable<Extract<AccountViewProps, { kind: "ready" }>["add"]>) {
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit.onSubmit();
  };
  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border border-input p-4">
      <h3 className="type-body1 font-semibold">{title}</h3>
      <TextInput id="saved-label" field={label} />
      <TextInput id="saved-nik" field={nik} inputMode="numeric" autoComplete="off" />
      <Button type="submit" disabled={submit.disabled}>
        {submit.label}
      </Button>
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
}) {
  return (
    <Field data-invalid={Boolean(field.error)}>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      <Input
        id={id}
        value={field.value}
        aria-invalid={Boolean(field.error)}
        aria-describedby={field.error ? `${id}-error` : undefined}
        onChange={(event) => field.onChange(event.target.value)}
        {...input}
      />
      {field.error ? <FieldError id={`${id}-error`}>{field.error}</FieldError> : null}
    </Field>
  );
}
