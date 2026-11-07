import Link from "next/link";
import { useEffect, useRef, type FormEvent } from "react";
import { UserPlusIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AuthCard } from "@/components/ui/layout/AuthCard";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";
import { ActionDialog, type ActionDialogProps } from "@/components/ui/layout/ActionDialog";

type TextField = {
  label: string;
  value: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Berubah saat field perlu difokus lagi, misalnya setelah "Ubah email" di dialog. */
  focusKey?: number;
  onChange: (value: string) => void;
  /** Galat bentuk tampil setelah field ditinggalkan, bukan saat masih diketik. */
  onBlur?: () => void;
};

export type RegisterFormProps = {
  kind: "form";
  heading: string;
  intro: string;
  email: TextField;
  nik: TextField;
  name: TextField;
  consent: { label: string; checked: boolean; error?: string; onChange: (checked: boolean) => void };
  requiredNote: string;
  /** `disabled` saat isian belum valid (email, NIK, persetujuan): tombol abu-abu dan tidak bisa diklik. */
  submit: { label: string; busy: boolean; disabled: boolean; onSubmit: () => void };
  login: { prompt: string; label: string; href: string };
};

export type RegisterViewProps = Omit<SiteShellProps, "children"> &
  RegisterFormProps & { dialog?: ActionDialogProps };

type InputProps = { type?: string; autoComplete?: string; inputMode?: "email" | "numeric" };

function TextInput({
  id,
  field,
  busy,
  ...input
}: { id: string; field: TextField; busy: boolean } & InputProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (field.focusKey !== undefined) ref.current?.focus();
  }, [field.focusKey]);
  const describedBy = [field.hint && `${id}-hint`, field.error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <Field data-invalid={Boolean(field.error)}>
      <FieldLabel htmlFor={id}>
        {field.label}
        {field.required ? (
          <span aria-hidden="true" className="text-signal-error">
            *
          </span>
        ) : null}
      </FieldLabel>
      <Input
        ref={ref}
        id={id}
        value={field.value}
        required={field.required}
        disabled={busy}
        aria-invalid={Boolean(field.error)}
        aria-describedby={describedBy || undefined}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
        {...input}
      />
      {field.hint ? <FieldDescription id={`${id}-hint`}>{field.hint}</FieldDescription> : null}
      {field.error ? <FieldError id={`${id}-error`}>{field.error}</FieldError> : null}
    </Field>
  );
}

export function RegisterView({ nav, footer, dialog, ...form }: RegisterViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <RegisterForm {...form} />
      {dialog ? <ActionDialog {...dialog} /> : null}
    </SiteShell>
  );
}

function RegisterForm(props: RegisterFormProps) {
  const { heading, intro, email, nik, name, consent, requiredNote, submit, login } = props;
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!submit.disabled) submit.onSubmit();
  };
  return (
    <AuthCard tone="info" icon={<UserPlusIcon />} title={heading} description={intro}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextInput
          id="register-email"
          field={email}
          busy={submit.busy}
          type="email"
          autoComplete="email"
          inputMode="email"
        />
        <TextInput id="register-nik" field={nik} busy={submit.busy} inputMode="numeric" autoComplete="off" />
        <TextInput id="register-name" field={name} busy={submit.busy} autoComplete="name" />
        <Field orientation="horizontal" data-invalid={Boolean(consent.error)}>
          <Checkbox
            id="register-consent"
            // Checkbox Base UI bukan input bawaan, jadi `htmlFor` saja tidak memberinya nama aksesibel.
            aria-labelledby="register-consent-label"
            checked={consent.checked}
            aria-invalid={Boolean(consent.error)}
            aria-describedby={consent.error ? "register-consent-error" : undefined}
            onCheckedChange={(checked) => consent.onChange(checked)}
          />
          <FieldLabel
            id="register-consent-label"
            htmlFor="register-consent"
            className="leading-snug font-normal"
          >
            {consent.label}
          </FieldLabel>
        </Field>
        {consent.error ? <FieldError id="register-consent-error">{consent.error}</FieldError> : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submit.busy || submit.disabled}
          aria-busy={submit.busy}
        >
          {submit.busy ? <Spinner data-icon="inline-start" /> : null}
          {submit.label}
        </Button>
        <p className="type-body2 text-center text-muted-foreground">
          {login.prompt}{" "}
          <Link href={login.href} className="font-semibold text-primary underline-offset-4 hover:underline">
            {login.label}
          </Link>
        </p>
        <p className="type-body2 text-muted-foreground">
          <span aria-hidden="true">* </span>
          {requiredNote}
        </p>
      </form>
    </AuthCard>
  );
}
