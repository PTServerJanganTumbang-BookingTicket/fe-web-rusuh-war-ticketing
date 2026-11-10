import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "cn";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../empty";

/** Ilustrasi Signal DS (spreadsheet "Icon & Asset reference for SJT") di `public/images/illustrations/`. */
export type EmptyIllustration = "events" | "tickets" | "box";

const ILLUSTRATIONS: Record<EmptyIllustration, string> = {
  events: "/images/illustrations/empty-events.webp",
  tickets: "/images/illustrations/empty-tickets.webp",
  box: "/images/illustrations/empty-box.webp",
};

/** Keadaan kosong dengan ilustrasi Signal DS. */
export function EmptyState({
  illustration = "box",
  title,
  description,
  children,
  bordered = false,
  className,
}: {
  /** Beranda: `events`. Tiket Saya: `tickets`. Lainnya: `box`. */
  illustration?: EmptyIllustration;
  title: string;
  description?: string;
  /** Aksi lanjutan, misalnya tombol atau tautan. */
  children?: ReactNode;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <Empty className={cn(bordered ? "border border-border" : "py-12", className)}>
      <EmptyHeader>
        <EmptyMedia>
          <Image
            src={ILLUSTRATIONS[illustration]}
            alt=""
            aria-hidden="true"
            width={311}
            height={294}
            className="mx-auto h-auto w-44"
          />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  );
}
