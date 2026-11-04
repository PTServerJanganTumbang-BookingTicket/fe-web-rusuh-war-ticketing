import type { ReactNode } from "react";
import { CircleAlertIcon, ClockIcon } from "lucide-react";
import { Button } from "../button";
import { Card, CardContent } from "../card";
import { cn } from "../cn.utils";
import { Spinner } from "../spinner";
import { BrandLink, type NavbarProps } from "./Navbar";
import type { FooterProps } from "./Footer";
import { SiteShell } from "./SiteShell";

export type StatusViewProps = {
  title: string;
  /** Penjelasan singkat. Boleh kosong untuk status memuat tanpa konteks (fallback route). */
  message?: string;
  /** `neutral`: sedang memuat atau mengalihkan. `error`: gagal. `warning`: sesi atau waktu habis. */
  tone: "neutral" | "error" | "warning";
  action?: { label: string; onClick: () => void };
  /** Navbar dan footer situs. Tanpa ini tampil header merek saja, misalnya fallback Suspense sebelum data sesi ada. */
  nav?: NavbarProps;
  footer?: FooterProps;
};

const TONE = {
  error: { icon: CircleAlertIcon, className: "bg-signal-bg-error text-signal-error" },
  warning: { icon: ClockIcon, className: "bg-signal-bg-warning text-signal-warning" },
} as const;

/** Header merek tanpa menu: halaman memuat sebelum navbar dengan status masuk tersedia. */
function BrandShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="w-full border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <BrandLink />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

/**
 * Layar status satu halaman: memuat, dialihkan, sesi habis, atau gagal. Bentuknya sama dengan ActionDialog (ikon
 * dalam lingkaran, judul, penjelasan, tombol pil) di dalam kerangka situs, bukan kartu berkepala merah.
 */
export function StatusView({ title, message, tone, action, nav, footer }: StatusViewProps) {
  const loading = tone === "neutral";
  const body = (
    <div className="flex min-h-[55vh] items-center justify-center">
      <Card className="w-full max-w-md rounded-3xl">
        <CardContent
          role={loading ? "status" : "alert"}
          aria-live={loading ? "polite" : "assertive"}
          aria-busy={loading}
          className="flex flex-col items-center gap-4 p-8 text-center"
        >
          {loading ? (
            <span
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-full bg-primary/10"
            >
              <Spinner className="size-7 text-primary" />
            </span>
          ) : (
            <StatusIcon tone={tone} />
          )}
          <div className="flex flex-col gap-2">
            <h1 className="type-h5">{title}</h1>
            {message ? <p className="type-body1 text-muted-foreground">{message}</p> : null}
          </div>
          {action ? (
            <Button size="lg" className="h-12 w-full rounded-full text-base" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );

  if (nav && footer) {
    return (
      <SiteShell nav={nav} footer={footer}>
        {body}
      </SiteShell>
    );
  }
  return <BrandShell>{body}</BrandShell>;
}

function StatusIcon({ tone }: { tone: "error" | "warning" }) {
  const { icon: Icon, className } = TONE[tone];
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-16 items-center justify-center rounded-full", className)}
    >
      <Icon className="size-7" />
    </span>
  );
}
