import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export type ScreenFrameProps = {
  title: string;
  /** Aksen kartu: netral (default), hijau untuk berhasil, merah galat untuk gagal/expired. */
  tone?: "default" | "success" | "danger";
  /** Sisi kanan judul: nama event, nomor order, atau timer. */
  trailing?: ReactNode;
  children: ReactNode;
};

// Kelas ditulis utuh supaya terdeteksi Tailwind.
const accent = {
  default: "",
  success: "border-t-4 border-t-signal-valid",
  danger: "border-t-4 border-t-signal-error",
} as const;

const titleTone = {
  default: "",
  success: "text-signal-valid",
  danger: "text-signal-error",
} as const;

/**
 * Kartu konten satu layar di dalam AppShell (navbar dan footer milik AppShell). Lebar mengikuti mobile, dan di desktop
 * menjadi kartu terpusat (Figma SJT ZAKI: form dan status di kartu tengah).
 */
export function ScreenFrame({ title, tone = "default", trailing, children }: ScreenFrameProps) {
  return (
    <section className={cn("mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm", accent[tone])}>
      <header className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-8">
        <h1 className={cn("type-h5", titleTone[tone])}>{title}</h1>
        {trailing ? <div className="type-body1 shrink-0 text-right text-muted-foreground">{trailing}</div> : null}
      </header>
      <div className="flex flex-col gap-4 px-5 pt-4 pb-5 sm:px-8 sm:pb-8">{children}</div>
    </section>
  );
}
