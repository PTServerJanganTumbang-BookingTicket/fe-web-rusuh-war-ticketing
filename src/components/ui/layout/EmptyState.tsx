import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "cn";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../empty";

/** Keadaan kosong dengan ilustrasi Signal DS (`public/images/illustrations/empty.svg`). */
export function EmptyState({
  title,
  description,
  children,
  bordered = false,
  className,
}: {
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
            src="/images/illustrations/empty.svg"
            alt=""
            aria-hidden="true"
            width={180}
            height={150}
            className="mx-auto h-auto w-36"
          />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  );
}
