import { CircleAlertIcon, ClockIcon } from "../icons";
import { Button } from "../button";
import { Card, CardContent } from "../card";
import { cn } from "../cn.utils";
import { Spinner } from "../spinner";
import type { NavbarProps } from "./Navbar";
import { BrandShell } from "./BrandShell";
import { PageSkeleton, type SkeletonVariant } from "./PageSkeleton";
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
  /**
   * Hanya untuk `neutral` yang sedang memuat data layar: tampilkan kerangka layar itu, bukan kartu spinner.
   * `title` dan `message` tetap diumumkan pembaca layar. Status mengalihkan tetap memakai kartu.
   */
  skeleton?: SkeletonVariant;
};

const TONE = {
  error: { icon: CircleAlertIcon, className: "bg-signal-bg-error text-signal-error" },
  warning: { icon: ClockIcon, className: "bg-signal-bg-warning text-signal-warning" },
} as const;

/**
 * Layar status satu halaman: memuat, dialihkan, sesi habis, atau gagal. Bentuknya sama dengan ActionDialog (ikon
 * dalam lingkaran, judul, penjelasan, tombol pil) di dalam kerangka situs, bukan kartu berkepala merah.
 */
export function StatusView({ title, message, tone, action, nav, footer, skeleton }: StatusViewProps) {
  const loading = tone === "neutral";
  const body =
    loading && skeleton ? (
      <PageSkeleton label={message ? `${title}. ${message}` : title} variant={skeleton} />
    ) : (
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
