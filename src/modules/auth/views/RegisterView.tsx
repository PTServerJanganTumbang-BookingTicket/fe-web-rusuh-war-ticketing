import Link from "next/link";
import type { FormEvent } from "react";
import { CircleCheckIcon, UserPlusIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AuthCard } from "@/components/ui/layout/AuthCard";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";

type TextField = {
  label: string;
  value: string;
  required?: boolean;
  hint?: string;
  error?: string;
  onChange: (value: string) => void;
};

export type RegisterFormProps = {
  kind: "form";
  heading: string;
  intro: string;
  error?: string;
  email: TextField;
  nik: TextField;
  name: TextField;
  consent: { label: string; checked: boolean; error?: string; onChange: (checked: boolean) => void };
  requiredNote: string;
  submit: { label: string; busy: boolean; onSubmit: () => void };
  login: { prompt: string; label: string; href: string };
};

export type RegisterViewProps = Omit<SiteShellProps, "children"> &
  (RegisterFormProps | { kind: "done"; heading: string; message: string });

type InputProps = { type?: string; autoComplete?: string; inputMode?: "email" | "numeric" };

function TextInput({
  id,
  field,
  busy,
  ...input
}: { id: string; field: TextField; busy: boolean } & InputProps) {
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
        id={id}
        value={field.value}
        required={field.required}
        disabled={busy}
        aria-invalid={Boolean(field.error)}
        aria-describedby={describedBy || undefined}
        onChange={(event) => field.onChange(event.target.value)}
        {...input}
      />
      {field.hint ? <FieldDescription id={`${id}-hint`}>{field.hint}</FieldDescription> : null}
      {field.error ? <FieldError id={`${id}-error`}>{field.error}</FieldError> : null}
    </Field>
  );
}

export function RegisterView({ nav, footer, ...screen }: RegisterViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      {screen.kind === "done" ? (
        <AuthCard
          tone="success"
          icon={<CircleCheckIcon />}
          title={screen.heading}
          description={screen.message}
        />
      ) : (
        <RegisterForm {...screen} />
      )}
    </SiteShell>
  );
}

function RegisterForm(props: RegisterFormProps) {
  const { heading, intro, error, email, nik, name, consent, requiredNote, submit, login } = props;
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit.onSubmit();
  };
  return (
    <AuthCard tone="info" icon={<UserPlusIcon />} title={heading} description={intro}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
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
            checked={consent.checked}
            aria-invalid={Boolean(consent.error)}
            aria-describedby={consent.error ? "register-consent-error" : undefined}
            onCheckedChange={(checked) => consent.onChange(checked)}
          />
          <FieldLabel htmlFor="register-consent" className="leading-snug font-normal">
            {consent.label}
          </FieldLabel>
        </Field>
        {consent.error ? <FieldError id="register-consent-error">{consent.error}</FieldError> : null}
        <Button type="submit" size="lg" className="w-full" disabled={submit.busy} aria-busy={submit.busy}>
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
