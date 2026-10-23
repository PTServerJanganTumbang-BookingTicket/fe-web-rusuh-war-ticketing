import { Suspense, type ReactNode } from "react";
import { AppProviders } from "@/features/shared/AppProviders";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

// Layout grup route tidak punya tipe LayoutProps sendiri, jadi children ditulis langsung.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
