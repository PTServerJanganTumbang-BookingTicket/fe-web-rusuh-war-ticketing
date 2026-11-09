import Link from "next/link";
import { buttonVariants } from "../button";
import { cn } from "../cn.utils";
import { UserRoundIcon } from "../icons";

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
  /** Pengganti bahasa. Tidak ada di header merek (fallback memuat). */
  language?: NavbarLanguage;
};

export type NavbarLanguage = {
  /** Nama grup untuk pembaca layar, misalnya "Bahasa". */
  label: string;
  value: string;
  options: { value: string; label: string; short: string }[];
  onChange: (value: string) => void;
};

/** Tombol bahasa bersebelahan (ID | EN). Pilihan aktif ditandai `aria-pressed`; nama lengkap ada di `aria-label`. */
function LanguageSwitch({ label, value, options, onChange }: NavbarLanguage) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-9 items-center rounded-full border border-border p-0.5 text-xs font-semibold"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-full min-w-9 rounded-full px-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
            )}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}

export function Navbar({ items, loginHref, loginLabel, account, language }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLink />
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
        <div className="flex items-center gap-2 sm:gap-3">
          {language ? <LanguageSwitch {...language} /> : null}
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
            <Link
              href={loginHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1.5 border-primary text-primary hover:text-primary",
              )}
            >
              <UserRoundIcon className="size-4" />
              {loginLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/** Logo merek yang menuju Home. Dipakai navbar dan header sederhana halaman memuat. */
export function BrandLink() {
  return (
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
  );
}
