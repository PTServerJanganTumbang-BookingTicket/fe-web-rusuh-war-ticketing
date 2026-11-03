import type { ReactNode } from "react";
import { Card, CardContent } from "../card";
import { cn } from "../cn.utils";

export type AuthCardTone = "brand" | "info" | "success" | "warning" | "error";

export type AuthCardProps = {
  icon: ReactNode;
  tone?: AuthCardTone;
  title: string;
  description?: string;
  children?: ReactNode;
};

// Kelas ditulis utuh supaya terdeteksi Tailwind.
const bubbleTone: Record<AuthCardTone, string> = {
  brand: "bg-signal-bg-info text-signal-info",
  info: "bg-signal-bg-info text-signal-info",
  success: "bg-signal-bg-valid text-signal-valid",
  warning: "bg-signal-bg-warning text-signal-warning",
  error: "bg-signal-bg-error text-signal-error",
};

/** Kartu autentikasi di tengah layar: ikon status, judul, deskripsi, lalu isi (form atau aksi). */
export function AuthCard({ icon, tone = "brand", title, description, children }: AuthCardProps) {
  return (
    <Card className="mx-auto w-full max-w-md gap-0 rounded-xl py-0 shadow-sm">
      <CardContent className="flex flex-col gap-5 p-6 sm:p-8">
        <div
          aria-hidden="true"
          className={cn(
            "flex size-11 items-center justify-center rounded-full [&_svg]:size-5",
            bubbleTone[tone],
          )}
        >
          {icon}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="type-h5 text-foreground">{title}</h1>
          {description ? <p className="type-body2 text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
