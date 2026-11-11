import type { ReactNode } from "react";
import { BrandShell } from "./BrandShell";
import { EmptyState, type EmptyIllustration } from "./EmptyState";

/** Layar galat satu halaman (404, error boundary) dengan ilustrasi Signal DS di dalam header merek. */
export function ErrorScreen({
  illustration,
  title,
  description,
  children,
}: {
  illustration: EmptyIllustration;
  title: string;
  description: string;
  /** Aksi: tombol atau tautan. */
  children?: ReactNode;
}) {
  return (
    <BrandShell>
      <div role="alert" className="flex min-h-[55vh] items-center justify-center">
        <EmptyState illustration={illustration} title={title} description={description}>
          {children}
        </EmptyState>
      </div>
    </BrandShell>
  );
}
