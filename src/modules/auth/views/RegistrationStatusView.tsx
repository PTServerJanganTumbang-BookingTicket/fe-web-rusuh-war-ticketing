import Link from "next/link";
import { CircleAlertIcon, CircleCheckIcon, MailIcon } from "@/components/ui/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/components/ui/cn.utils";
import { Spinner } from "@/components/ui/spinner";
import { AuthCard } from "@/components/ui/layout/AuthCard";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";

type LinkProps = { label: string; href: string };

const statusIcon = {
  info: <MailIcon />,
  success: <CircleCheckIcon />,
  error: <CircleAlertIcon />,
};

export type RegistrationStatusViewProps = Omit<SiteShellProps, "children"> & {
  tone: "info" | "success" | "error";
  title: string;
  message: string;
  steps?: string[];
  detail?: string;
  /** Satu pengumuman status yang sopan, tidak menumpuk notifikasi duplikat. */
  status?: string;
  error?: string;
  action?: { label: string; busy: boolean; disabled: boolean; onClick: () => void };
  /** Tautan utama bila tidak ada `action`, atau tautan kedua di bawahnya. */
  link?: LinkProps;
  footnote?: string;
};

/** Perjalanan verifikasi pendaftaran: menunggu verifikasi, link terkirim, dan email terverifikasi (desain 03). */
export function RegistrationStatusView(props: RegistrationStatusViewProps) {
  const { nav, footer, tone, title, message, steps, detail, status, error, action, link, footnote } = props;
  return (
    <SiteShell nav={nav} footer={footer}>
      <AuthCard tone={tone} icon={statusIcon[tone]} title={title} description={message}>
        {steps ? (
          <ol className="type-body2 flex list-decimal flex-col gap-1 pl-5 text-foreground">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : null}
        {detail ? <p className="type-body2 text-muted-foreground">{detail}</p> : null}
        <p role="status" className="type-body2 text-signal-valid empty:hidden">
          {status}
        </p>
        {error ? (
          <p role="alert" className="type-body2 text-signal-error">
            {error}
          </p>
        ) : null}
        {action ? (
          <Button
            size="lg"
            className="w-full"
            disabled={action.disabled}
            aria-busy={action.busy}
            onClick={action.onClick}
          >
            {action.busy ? <Spinner data-icon="inline-start" /> : null}
            {action.label}
          </Button>
        ) : null}
        {link ? (
          <Link
            href={link.href}
            className={cn(
              buttonVariants({ size: "lg", variant: action ? "outline" : "default" }),
              "w-full",
              action && "border-primary text-primary",
            )}
          >
            {link.label}
          </Link>
        ) : null}
        {footnote ? <p className="type-body2 text-muted-foreground">{footnote}</p> : null}
      </AuthCard>
    </SiteShell>
  );
}
