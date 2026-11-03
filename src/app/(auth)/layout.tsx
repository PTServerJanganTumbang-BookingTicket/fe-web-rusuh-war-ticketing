import { Suspense, type ReactNode } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/core/views/ScreenLoading";

// Login, verifikasi link, dan register memakai form klien (ADR-0007: Server Component + form client).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
