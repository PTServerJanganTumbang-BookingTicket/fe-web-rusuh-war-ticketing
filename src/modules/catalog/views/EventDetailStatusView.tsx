import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, type EmptyIllustration } from "@/components/ui/layout/EmptyState";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";
import { RetryButton, type RetryProps } from "./RetryButton";

export type EventDetailStatusViewProps = Omit<SiteShellProps, "children"> & {
  illustration: EmptyIllustration;
  title: string;
  description: string;
  /** Jalan pulang ke Beranda; selalu ada supaya layar ini tidak pernah buntu. */
  home: { label: string; href: string };
  /** Hanya untuk galat yang bisa pulih (jaringan, server); event yang tidak ada tidak punya tombol ini. */
  retry?: RetryProps;
};

/** Event tidak ditemukan atau detailnya gagal dimuat, di dalam kerangka situs supaya navigasi tetap ada. */
export function EventDetailStatusView({
  nav,
  footer,
  illustration,
  title,
  description,
  home,
  retry,
}: EventDetailStatusViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <div role="alert" className="flex min-h-[55vh] items-center justify-center">
        <EmptyState illustration={illustration} title={title} description={description}>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            {retry ? <RetryButton {...retry} /> : null}
            <Link
              href={home.href}
              className={buttonVariants({ size: "lg", variant: retry ? "ghost" : "default" })}
            >
              {home.label}
            </Link>
          </div>
        </EmptyState>
      </div>
    </SiteShell>
  );
}
