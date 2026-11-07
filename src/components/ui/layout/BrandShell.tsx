import type { ReactNode } from "react";
import { BrandLink } from "./Navbar";

/** Header merek tanpa menu: halaman memuat sebelum navbar dengan status masuk tersedia. */
export function BrandShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="w-full border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <BrandLink />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
