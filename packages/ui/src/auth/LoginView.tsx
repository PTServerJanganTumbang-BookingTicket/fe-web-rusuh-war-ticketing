import type { FormEvent } from "react";
import { Alert } from "../primitives/Alert";
import { Button } from "../primitives/Button";
import { ScreenFrame } from "../shared/ScreenFrame";
import { TextField } from "../shared/TextField";

type Action = { label: string; onClick: () => void; disabled?: boolean };

export type LoginViewProps = {
  title: string;
  /** Pesan di atas konten, mis. sesi berakhir atau dicabut, atau galat dari server. */
  notice?: { tone: "info" | "warning" | "error"; message: string };
  content:
    | {
        kind: "form";
        heading: string;
        intro: string;
        email: { label: string; value: string; placeholder: string; hint: string; error?: string; onChange: (value: string) => void };
        submit: Action;
        onSubmit: () => void;
        footer: { text: string; link: { label: string; href: string } };
      }
    | {
        kind: "sent";
        heading: string;
        message: string;
        note: string;
        resend: Action;
        changeEmail: Action;
        /** Hanya mode mock: pengganti membuka email. */
        mockOpenLink?: Action;
      }
    | { kind: "signedIn"; heading: string; message: string; proceed: Action; logout: Action }
    | { kind: "loading"; message: string };
};

/** Login passwordless (Figma SJT ZAKI, frame Login): satu field email, link aman dikirim ke inbox. */
export function LoginView({ title, notice, content }: LoginViewProps) {
  return (
    <ScreenFrame title={title}>
      {notice ? (
        <Alert variant={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.message}
        </Alert>
      ) : null}

      {content.kind === "loading" ? (
        <p role="status" className="type-body1 py-4 text-center text-muted-foreground">
          {content.message}
        </p>
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
          <Button type="submit" size="lg" disabled={content.submit.disabled}>
            {content.submit.label}
          </Button>
          <p className="type-body2 text-center text-muted-foreground">
            {content.footer.text}{" "}
            <a href={content.footer.link.href} className="font-semibold text-primary hover:underline">
              {content.footer.link.label}
            </a>
          </p>
        </form>
      ) : null}

      {content.kind === "sent" ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
          <div>
            <h2 className="type-h5">{content.heading}</h2>
            <p className="type-body1 mt-1 text-muted-foreground">{content.message}</p>
          </div>
          <p className="type-body2 rounded-lg bg-signal-disable p-3 text-muted-foreground">{content.note}</p>
          <Button size="lg" onClick={content.resend.onClick} disabled={content.resend.disabled}>
            {content.resend.label}
          </Button>
          <Button variant="outline" size="lg" onClick={content.changeEmail.onClick}>
            {content.changeEmail.label}
          </Button>
          {content.mockOpenLink ? (
            <Button variant="ghost" onClick={content.mockOpenLink.onClick} disabled={content.mockOpenLink.disabled}>
              {content.mockOpenLink.label}
            </Button>
          ) : null}
        </div>
      ) : null}

      {content.kind === "signedIn" ? (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="type-h5">{content.heading}</h2>
            <p className="type-body1 mt-1 text-muted-foreground">{content.message}</p>
          </div>
          <Button size="lg" onClick={content.proceed.onClick}>
            {content.proceed.label}
          </Button>
          <Button variant="outline" size="lg" onClick={content.logout.onClick} disabled={content.logout.disabled}>
            {content.logout.label}
          </Button>
        </div>
      ) : null}
    </ScreenFrame>
  );
}
