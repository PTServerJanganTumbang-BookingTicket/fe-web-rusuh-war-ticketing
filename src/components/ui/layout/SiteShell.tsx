import type { ReactNode } from "react";
import { Footer, type FooterProps } from "./Footer";
import { Navbar, type NavbarProps } from "./Navbar";

export type SiteShellProps = { nav: NavbarProps; footer: FooterProps; children: ReactNode };

/** Kerangka halaman situs: navbar dan footer yang sama dengan Home, isi di tengah dengan latar putih. */
export function SiteShell({ nav, footer, children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar {...nav} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</main>
      <Footer {...footer} />
    </div>
  );
}
