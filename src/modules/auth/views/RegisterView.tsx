import Link from "next/link";
import type { FormEvent } from "react";
import { CircleCheckIcon, MailIcon, UserPlusIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/components/ui/cn.utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  email: TextField;
  nik: TextField;
  name: TextField;
  consent: { label: string; checked: boolean; error?: string; onChange: (checked: boolean) => void };
  requiredNote: string;
  submit: { label: string; busy: boolean; onSubmit: () => void };
  login: { prompt: string; label: string; href: string };
};

export type RegisterDialogProps =
  | {
      kind: "confirm";
      title: string;
      description: string;
      /** Isian lengkap hanya tampil di sini dan di form; tidak dikirim ke tempat lain. */
      values: { label: string; value: string }[];
      error?: string;
      busy: boolean;
      busyNote: string;
      confirm: { label: string; onClick: () => void };
      edit: { label: string; onClick: () => void };
    }
  | {
      kind: "success";
      title: string;
      message: string;
      note: string;
      ok: { label: string; onClick: () => void };
    };

export type RegisterViewProps = Omit<SiteShellProps, "children"> &
  RegisterFormProps & { dialog?: RegisterDialogProps };

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

export function RegisterView({ nav, footer, dialog, ...form }: RegisterViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <RegisterForm {...form} />
      {dialog ? <RegisterDialog dialog={dialog} /> : null}
    </SiteShell>
  );
}

/** Desktop: modal di tengah. Mobile: bottom drawer. Escape atau klik luar sama dengan "Ubah data", kecuali saat mendaftar. */
function RegisterDialog({ dialog }: { dialog: RegisterDialogProps }) {
  const dismiss = dialog.kind === "confirm" ? dialog.edit.onClick : dialog.ok.onClick;
  const locked = dialog.kind === "confirm" && dialog.busy;
  return (
    <Dialog open onOpenChange={(open) => !open && !locked && dismiss()}>
      <DialogContent showCloseButton={!locked} aria-busy={locked}>
        <span
          aria-hidden="true"
          className={cn(
            "flex size-11 items-center justify-center rounded-full [&_svg]:size-5",
            dialog.kind === "success"
              ? "bg-signal-bg-valid text-signal-valid"
              : "bg-signal-bg-info text-signal-info",
          )}
        >
          {dialog.kind === "success" ? <CircleCheckIcon /> : <MailIcon />}
        </span>
        <DialogHeader className="gap-2">
          <DialogTitle>{dialog.title}</DialogTitle>
          <DialogDescription>
            {dialog.kind === "success" ? dialog.message : dialog.description}
          </DialogDescription>
        </DialogHeader>
        {dialog.kind === "success" ? (
          <>
            <p className="type-body2 text-muted-foreground">{dialog.note}</p>
            <Button size="lg" className="w-full" onClick={dialog.ok.onClick}>
              {dialog.ok.label}
            </Button>
          </>
        ) : (
          <>
            <dl className="flex flex-col gap-3 rounded-xl border border-border p-4">
              {dialog.values.map((item) => (
                <div key={item.label}>
                  <dt className="type-body2 text-muted-foreground">{item.label}</dt>
                  <dd className="type-body1 break-all tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
            {dialog.error ? (
              <Alert variant="destructive">
                <AlertDescription>{dialog.error}</AlertDescription>
              </Alert>
            ) : null}
            {dialog.busy ? (
              <p role="status" className="type-body2 text-muted-foreground">
                {dialog.busyNote}
              </p>
            ) : null}
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full"
                disabled={dialog.busy}
                aria-busy={dialog.busy}
                onClick={dialog.confirm.onClick}
              >
                {dialog.busy ? <Spinner data-icon="inline-start" /> : null}
                {dialog.confirm.label}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-primary text-primary"
                disabled={dialog.busy}
                onClick={dialog.edit.onClick}
              >
                {dialog.edit.label}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RegisterForm(props: RegisterFormProps) {
  const { heading, intro, email, nik, name, consent, requiredNote, submit, login } = props;
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit.onSubmit();
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
