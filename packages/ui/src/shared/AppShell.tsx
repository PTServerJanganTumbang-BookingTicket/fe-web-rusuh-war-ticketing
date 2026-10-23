import type { ReactNode } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import { cn } from "../lib/cn";
import { Logo, type LogoProps } from "./Logo";

export type NavLinksProps = { items: { label: string; href: string; active: boolean }[] };

/** Navigasi utama. Hanya tampil di desktop (Figma: navbar mobile berisi logo dan tombol login saja). */
export function NavLinks({ items }: NavLinksProps) {
  return (
    <ul className="flex items-center gap-8">
      {items.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "type-body1 rounded-md outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50",
              item.active ? "font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export type AccountLinkProps = { label: string; href: string };

export function AccountLink({ label, href }: AccountLinkProps) {
  return (
    <a
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-primary outline-none hover:bg-accent/80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <UserRound aria-hidden className="size-4" />
      {label}
    </a>
  );
}

export type AppShellProps = {
  logo: LogoProps;
  navLabel: string;
  /** Slot untuk NavLinks: tautan aktif bergantung pada URL, jadi pemanggil boleh mengisinya lewat Suspense. */
  nav: ReactNode;
  /** Slot untuk AccountLink. */
  account: ReactNode;
  footer: { copyright: string; trust: string };
  children: ReactNode;
};

/** Kerangka situs: navbar atas, konten, dan footer (Figma SJT ZAKI, semua frame desktop dan mobile). */
export function AppShell({ logo, navLabel, nav, account, footer, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:h-20 sm:px-8">
          <Logo {...logo} />
          <div className="flex items-center gap-8">
            <nav aria-label={navLabel} className="hidden md:block">
              {nav}
            </nav>
            {account}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-8 sm:py-10">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="type-body2 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 text-muted-foreground sm:px-8">
          <p>{footer.copyright}</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck aria-hidden className="size-4" />
            {footer.trust}
          </p>
        </div>
      </footer>
    </div>
  );
}
