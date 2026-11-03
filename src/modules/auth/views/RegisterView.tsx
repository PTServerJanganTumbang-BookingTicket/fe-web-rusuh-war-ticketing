import Link from "next/link";
import type { FormEvent } from "react";
import { ScreenFrame } from "@/components/ui/layout/ScreenFrame";
import { Alert, Button, Checkbox, describedBy, Field, Input } from "@/components/ui/primitives";

type TextField = {
  label: string;
  value: string;
  hint?: string;
  error?: string;
  onChange: (value: string) => void;
};

export type RegisterViewProps = { title: string } & (
  | {
      kind: "form";
      intro: string;
      error?: string;
      email: TextField;
      nik: TextField;
      name: TextField;
      consent: { label: string; checked: boolean; error?: string; onChange: (checked: boolean) => void };
      submit: { label: string; disabled: boolean; onSubmit: () => void };
      login: { prompt: string; label: string; href: string };
    }
  | { kind: "done"; heading: string; message: string }
);

function TextInput({
  id,
  field,
  ...input
}: {
  id: string;
  field: TextField;
  type?: string;
  autoComplete?: string;
  inputMode?: "email" | "numeric";
}) {
  return (
    <Field id={id} label={field.label} hint={field.hint} error={field.error}>
      <Input
        id={id}
        value={field.value}
        aria-invalid={Boolean(field.error)}
        aria-describedby={describedBy(id, field)}
        onChange={(event) => field.onChange(event.target.value)}
        {...input}
      />
    </Field>
  );
}

export function RegisterView(props: RegisterViewProps) {
  if (props.kind === "done") {
    return (
      <ScreenFrame title={props.title}>
        <h2 className="type-title-bold">{props.heading}</h2>
        <p className="type-body1" role="status">
          {props.message}
        </p>
      </ScreenFrame>
    );
  }

  const { intro, error, email, nik, name, consent, submit, login } = props;
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit.onSubmit();
  };
  return (
    <ScreenFrame title={props.title}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="type-body1">{intro}</p>
        {error ? (
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        ) : null}
        <TextInput id="register-email" field={email} type="email" autoComplete="email" inputMode="email" />
        <TextInput id="register-nik" field={nik} inputMode="numeric" autoComplete="off" />
        <TextInput id="register-name" field={name} autoComplete="name" />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-3">
            <Checkbox
              id="register-consent"
              checked={consent.checked}
              aria-invalid={Boolean(consent.error)}
              aria-describedby={consent.error ? "register-consent-error" : undefined}
              onCheckedChange={(checked) => consent.onChange(checked === true)}
            />
            <label htmlFor="register-consent" className="type-body2">
              {consent.label}
            </label>
          </div>
          {consent.error ? (
            <p id="register-consent-error" role="alert" className="type-body2 text-signal-error">
              {consent.error}
            </p>
          ) : null}
        </div>
        <Button type="submit" size="lg" disabled={submit.disabled}>
          {submit.label}
        </Button>
        <p className="type-body2">
          {login.prompt}{" "}
          <Link href={login.href} className="font-semibold text-primary underline-offset-4 hover:underline">
            {login.label}
          </Link>
        </p>
      </form>
    </ScreenFrame>
  );
}
