import type { FormEvent } from "react";
import { Alert } from "../primitives/Alert";
import { Button } from "../primitives/Button";
import { Dialog } from "../primitives/Dialog";
import { ScreenFrame } from "../shared/ScreenFrame";
import { TextField } from "../shared/TextField";

type Action = { label: string; onClick: () => void; disabled?: boolean };
type Field = { label: string; value: string; placeholder: string; hint: string; error?: string; onChange: (value: string) => void };

export type RegisterViewProps = {
  title: string;
  notice?: { tone: "info" | "warning" | "error"; message: string };
  content:
    | {
        kind: "form";
        heading: string;
        intro: string;
        email: Field;
        /** Tidak ada di mode kirim ulang email verifikasi. */
        nik?: Field & { counter: string };
        note?: string;
        review: Action;
        onSubmit: () => void;
        footer: { text: string; link: { label: string; href: string } };
      }
    | {
        kind: "registered";
        heading: string;
        message: string;
        steps: string[];
        resend: Action;
        goToLogin: { label: string; href: string };
        note: string;
        /** Hanya mode mock: pengganti membuka email verifikasi. */
        mockOpenLink?: Action;
      };
  /** Review sebelum daftar dan hasil gagalnya, dalam satu dialog (Figma: "one feedback surface per event"). */
  dialog?: {
    title: string;
    description: string;
    /** false selama permintaan berjalan: dialog tidak bisa ditutup. */
    dismissible: boolean;
    onClose: () => void;
    rows?: { label: string; value: string }[];
    note?: string;
    tone?: "info" | "error";
    primary: Action;
    secondary?: Action;
  };
};

/** Registrasi (Figma SJT ZAKI, frame Registration dan Confirmation & Success). */
export function RegisterView({ title, notice, content, dialog }: RegisterViewProps) {
  return (
    <ScreenFrame title={title}>
      {notice ? (
        <Alert variant={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.message}
        </Alert>
      ) : null}

      {content.kind === "form" ? (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            content.onSubmit();
          }}
        >
          <div>
            <h2 className="type-h5">{content.heading}</h2>
            <p className="type-body1 mt-1 text-muted-foreground">{content.intro}</p>
          </div>
          <TextField type="email" inputMode="email" autoComplete="email" {...content.email} />
          {/* Tanpa maxLength: batas 16 dipotong setelah karakter non-digit dibuang, supaya paste "3171-0000-…" tidak terpotong. */}
          {content.nik ? <TextField type="text" inputMode="numeric" autoComplete="off" {...content.nik} /> : null}
          {content.note ? <p className="type-body2 rounded-lg bg-signal-disable p-3 text-muted-foreground">{content.note}</p> : null}
          <Button type="submit" size="lg" disabled={content.review.disabled}>
            {content.review.label}
          </Button>
          <p className="type-body2 text-center text-muted-foreground">
            {content.footer.text}{" "}
            <a href={content.footer.link.href} className="font-semibold text-primary hover:underline">
              {content.footer.link.label}
            </a>
          </p>
        </form>
      ) : null}

      {content.kind === "registered" ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
          <div>
            <h2 className="type-h5">{content.heading}</h2>
            <p className="type-body1 mt-1 text-muted-foreground">{content.message}</p>
          </div>
          <ol className="type-body1 list-decimal space-y-1 pl-5 text-muted-foreground">
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Button size="lg" onClick={content.resend.onClick} disabled={content.resend.disabled}>
            {content.resend.label}
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href={content.goToLogin.href}>{content.goToLogin.label}</a>
          </Button>
          <p className="type-body2 text-muted-foreground">{content.note}</p>
          {content.mockOpenLink ? (
            <Button variant="ghost" onClick={content.mockOpenLink.onClick} disabled={content.mockOpenLink.disabled}>
              {content.mockOpenLink.label}
            </Button>
          ) : null}
        </div>
      ) : null}

      {dialog ? (
        <Dialog
          open
          onOpenChange={(open) => (open ? undefined : dialog.onClose())}
          title={dialog.title}
          description={dialog.description}
          dismissible={dialog.dismissible}
        >
          {dialog.rows ? (
            <dl className="flex flex-col gap-3 rounded-lg bg-signal-disable p-4">
              {dialog.rows.map((row) => (
                <div key={row.label}>
                  <dt className="type-body2 text-muted-foreground">{row.label}</dt>
                  <dd className="type-title break-all">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {dialog.note ? (
            <p role={dialog.tone === "error" ? "alert" : "status"} className={dialog.tone === "error" ? "type-body2 text-signal-error" : "type-body2 text-primary"}>
              {dialog.note}
            </p>
          ) : null}
          <Button size="lg" onClick={dialog.primary.onClick} disabled={dialog.primary.disabled}>
            {dialog.primary.label}
          </Button>
          {dialog.secondary ? (
            <Button variant="outline" size="lg" onClick={dialog.secondary.onClick} disabled={dialog.secondary.disabled}>
              {dialog.secondary.label}
            </Button>
          ) : null}
        </Dialog>
      ) : null}
    </ScreenFrame>
  );
}
