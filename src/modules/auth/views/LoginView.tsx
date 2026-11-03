import Link from "next/link";
import type { FormEvent } from "react";
import { ScreenFrame } from "@/components/ui/layout/ScreenFrame";
import { Alert, Button, describedBy, Field, Input } from "@/components/ui/primitives";

type LinkProps = { label: string; href: string };

export type LoginViewProps = { title: string; error?: string } & (
  | {
      kind: "form";
      intro: string;
      optionalNote: string;
      email: {
        label: string;
        placeholder: string;
        value: string;
        error?: string;
        onChange: (value: string) => void;
      };
      submit: { label: string; disabled: boolean; onSubmit: () => void };
      register: { prompt: string } & LinkProps;
    }
  | {
      kind: "sent";
      heading: string;
      message: string;
      notice?: string;
      resend: { label: string; disabled: boolean; onClick: () => void };
      changeEmail: { label: string; onClick: () => void };
      /** Hanya di mode mock: membuka layar verifikasi seperti link dari email. */
      mockLink?: LinkProps;
    }
);

export function LoginView(props: LoginViewProps) {
  return (
    <ScreenFrame title={props.title}>
      {props.error ? (
        <Alert variant="error" role="alert">
          {props.error}
        </Alert>
      ) : null}
      {props.kind === "form" ? <LoginForm {...props} /> : <LinkSent {...props} />}
    </ScreenFrame>
  );
}

function LoginForm({
  intro,
  optionalNote,
  email,
  submit,
  register,
}: Extract<LoginViewProps, { kind: "form" }>) {
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit.onSubmit();
  };
  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="type-body1">{intro}</p>
      <Field id="login-email" label={email.label} error={email.error}>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={email.placeholder}
          value={email.value}
          aria-invalid={Boolean(email.error)}
          aria-describedby={describedBy("login-email", { error: email.error })}
          onChange={(event) => email.onChange(event.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" disabled={submit.disabled}>
        {submit.label}
      </Button>
      <p className="type-body2 text-muted-foreground">{optionalNote}</p>
      <p className="type-body2">
        {register.prompt}{" "}
        <Link href={register.href} className="font-semibold text-primary underline-offset-4 hover:underline">
          {register.label}
        </Link>
      </p>
    </form>
  );
}

function LinkSent({
  heading,
  message,
  notice,
  resend,
  changeEmail,
  mockLink,
}: Extract<LoginViewProps, { kind: "sent" }>) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="type-title-bold">{heading}</h2>
      <p className="type-body1">{message}</p>
      {notice ? <Alert variant="success">{notice}</Alert> : null}
      <Button variant="outline" size="lg" disabled={resend.disabled} onClick={resend.onClick}>
        {resend.label}
      </Button>
      <Button variant="ghost" onClick={changeEmail.onClick}>
        {changeEmail.label}
      </Button>
      {mockLink ? (
        <Button asChild variant="link">
          <Link href={mockLink.href}>{mockLink.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
