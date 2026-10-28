import type { ReactNode } from "react";
import { cn } from "../cn";

export type ScreenFrameProps = {
  title: string;
  /** Warna header: merah merek Signal (default), hijau untuk berhasil, merah galat untuk gagal/expired. */
  tone?: "default" | "success" | "danger";
  /** Sisi kanan header: nama event, link login, atau timer. */
  trailing?: ReactNode;
  children: ReactNode;
};

// Kelas ditulis utuh supaya terdeteksi Tailwind.
const headerTone = {
  default: "bg-brand",
  success: "bg-signal-valid",
  danger: "bg-signal-error",
} as const;

/**
 * Kerangka layar Signal DS: header berwarna merek + kartu putih di atas latar abu-abu muda (pola AuthLayout/KioskLayout Signal).
 * Lebar mengikuti layout mobile (WebView).
 */
export function ScreenFrame({ title, tone = "default", trailing, children }: ScreenFrameProps) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <div className="overflow-hidden rounded-2xl bg-card shadow-lg">
        <header
          className={cn("flex items-center justify-between gap-3 px-5 py-4 text-white", headerTone[tone])}
        >
          <h1 className="type-h6">{title}</h1>
          {trailing ? <div className="type-body1 text-white/90">{trailing}</div> : null}
        </header>
        <div className="flex flex-col gap-4 p-5">{children}</div>
      </div>
    </main>
  );
}
