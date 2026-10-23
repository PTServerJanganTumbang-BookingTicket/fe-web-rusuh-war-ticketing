import type { ReactNode } from "react";
import { SiteShell } from "@/features/shared/SiteShell";

// Navbar dan footer untuk semua route situs. Route embed WebView ada di luar grup ini (ADR-0008).
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
