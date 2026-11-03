import Link from "next/link";
import type { FormEvent } from "react";
import { CircleCheckIcon, ClockIcon, InfoIcon, MailIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AuthCard } from "@/components/ui/layout/AuthCard";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";

type LinkProps = { label: string; href: string };
type Chrome = Omit<SiteShellProps, "children">;

export type LoginFormProps = {
  kind: "form";
  /** `expired`: sesi akun berakhir; form sama, judul dan tombol berbeda. */
  variant: "default" | "expired";
  heading: string;
  intro: string;
  error?: string;
  email: {
    label: string;
    placeholder: string;
    hint: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
    onBlur: () => void;
  };
  requiredNote: string;
  submit: { label: string; busy: boolean; disabled: boolean; onSubmit: () => void };
  register?: { prompt: string } & LinkProps;
  inboxHint?: string;
};

export type LinkSentProps = {
  kind: "sent";
  heading: string;
  message: string;
  error?: string;
  notice: { title: string; body: string };
  help: string;
  resent?: string;
  resend: { label: string; disabled: boolean; onClick: () => void };
  changeEmail: { label: string; onClick: () => void };
  /** Hanya di mode mock: membuka layar verifikasi seperti link dari email. */
  mockLink?: LinkProps;
};

export type LoginViewProps = Chrome & (LoginFormProps | LinkSentProps);

export function LoginView({ nav, footer, ...screen }: LoginViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      {screen.kind === "form" ? <LoginForm {...screen} /> : <LinkSent {...screen} />}
    </SiteShell>
  );
}

function LoginForm({
  variant,
  heading,
  intro,
  error,
  email,
  requiredNote,
  submit,
  register,
  inboxHint,
}: LoginFormProps) {
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit.onSubmit();
  };
  const describedBy = email.error ? "login-email-error" : "login-email-hint";
  return (
    <AuthCard
      tone={variant === "expired" ? "warning" : "info"}
      icon={variant === "expired" ? <ClockIcon /> : <MailIcon />}
      title={heading}
      description={intro}
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={Boolean(email.error)}>
          <FieldLabel htmlFor="login-email">
            {email.label}
            <span aria-hidden="true" className="text-signal-error">
              *
            </span>
          </FieldLabel>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder={email.placeholder}
            value={email.value}
            aria-invalid={Boolean(email.error)}
            aria-describedby={describedBy}
            disabled={submit.busy}
            onChange={(event) => email.onChange(event.target.value)}
            onBlur={email.onBlur}
          />
          {email.error ? (
            <FieldError id="login-email-error">{email.error}</FieldError>
          ) : (
            <FieldDescription id="login-email-hint">{email.hint}</FieldDescription>
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={submit.disabled} aria-busy={submit.busy}>
          {submit.busy ? <Spinner data-icon="inline-start" /> : null}
          {submit.label}
        </Button>
        {register ? (
          <p className="type-body2 text-center text-muted-foreground">
            {register.prompt}{" "}
            <Link
              href={register.href}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {register.label}
            </Link>
          </p>
        ) : null}
        <p className="type-body2 text-muted-foreground">
          <span aria-hidden="true">* </span>
          {requiredNote}
        </p>
        {inboxHint ? (
          <Alert variant="success" role="note">
            <CircleCheckIcon />
            <AlertDescription className="text-signal-valid">{inboxHint}</AlertDescription>
          </Alert>
        ) : null}
      </form>
    </AuthCard>
  );
}

function LinkSent({
  heading,
  message,
  error,
  notice,
  help,
  resent,
  resend,
  changeEmail,
  mockLink,
}: LinkSentProps) {
  return (
    <AuthCard tone="success" icon={<CircleCheckIcon />} title={heading} description={message}>
      <div className="flex flex-col gap-4" aria-live="polite">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Alert variant="info" role="note">
          <InfoIcon />
          <AlertTitle>{notice.title}</AlertTitle>
          <AlertDescription className="text-signal-info">{notice.body}</AlertDescription>
        </Alert>
        <p className="type-body2 text-muted-foreground">{help}</p>
        {resent ? (
          <p role="status" className="type-body2 text-signal-valid">
            {resent}
          </p>
        ) : null}
        <Button size="lg" className="w-full" disabled={resend.disabled} onClick={resend.onClick}>
          {resend.label}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full border-primary text-primary"
          onClick={changeEmail.onClick}
        >
          {changeEmail.label}
        </Button>
        {mockLink ? (
          <Link href={mockLink.href} className={buttonVariants({ variant: "link" })}>
            {mockLink.label}
          </Link>
        ) : null}
      </div>
    </AuthCard>
  );
}
