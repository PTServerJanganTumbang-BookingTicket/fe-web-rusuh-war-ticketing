import Link from "next/link";
import { Button } from "../primitives/Button";

export type NavItem = {
  label: string;
  href: string;
  active?: boolean;
};

export type NavbarAccount = {
  /** Nama pendek yang terlihat di layar lebar. */
  label: string;
  initials: string;
  href: string;
  /** Nama lengkap tujuan tautan untuk pembaca layar, misalnya "Profil saya (you@example.com)". */
  ariaLabel: string;
};

export type NavbarProps = {
  items: NavItem[];
  loginHref: string;
  loginLabel: string;
  /** Ada saat customer masuk; menggantikan tombol masuk. */
  account?: NavbarAccount;
};

export function Navbar({ items, loginHref, loginLabel, account }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <rect x="3" y="6" width="4" height="12" rx="1" fill="currentColor" />
              <rect x="10" y="3" width="4" height="18" rx="1" fill="currentColor" />
              <rect x="17" y="8" width="4" height="8" rx="1" fill="currentColor" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-foreground">rusuh.</span>
            <span className="text-[10px] text-muted-foreground">BOOKING TIKET</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${item.active ? "text-primary" : "text-muted-foreground"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {account ? (
          <Link
            href={account.href}
            aria-label={account.ariaLabel}
            className="flex min-h-11 items-center gap-2 rounded-full border border-border py-1 pr-1 pl-1 transition-colors hover:border-primary/50 sm:pr-4"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              {account.initials}
            </span>
            <span className="hidden max-w-40 truncate text-sm font-medium text-foreground sm:inline">
              {account.label}
            </span>
          </Link>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={loginHref}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {loginLabel}
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
