import Link from "next/link";
import { buttonVariants } from "../button";
import { cn } from "../cn.utils";
import { UserRoundIcon } from "../icons";
import { NavbarMenu } from "./NavbarMenu";
import { ToggleGroup, ToggleGroupItem } from "../toggle-group";

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
  /** Menu untuk layar sempit; tanpa ini tautan utama hanya terlihat di layar lebar. */
  menu?: { label: string; closeLabel: string };
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
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        const chosen = next.find((item) => item !== value);
        if (chosen) onChange(chosen);
      }}
      className="h-9 items-center rounded-full border border-border p-0.5 text-xs font-semibold"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
          variant="segment"
          size="fill"
        >
          {option.short}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function Navbar({ items, loginHref, loginLabel, account, language, menu }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLink />
        <nav className="hidden items-center gap-8 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-6 items-center text-sm font-medium transition-colors hover:text-primary ${item.active ? "text-primary" : "text-muted-foreground"}`}
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
              aria-label={loginLabel}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1.5 border-primary text-primary hover:text-primary",
              )}
            >
              <UserRoundIcon aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">{loginLabel}</span>
            </Link>
          )}
          {menu ? <NavbarMenu items={items} {...menu} /> : null}
        </div>
      </div>
    </header>
  );
}

/** Logo merek yang menuju Home. Dipakai navbar dan header sederhana halaman memuat. Batang logo bergerak saat di-hover (globals.css). */
export function BrandLink() {
  return (
    <Link href="/" className="brand-link group flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110 group-focus-visible:-rotate-6 group-focus-visible:scale-110 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white">
          <rect className="brand-bar" x="2.2" y="9" width="1.8" height="6" rx="0.9" fill="currentColor" />
          <rect className="brand-bar" x="5.2" y="6" width="1.8" height="12" rx="0.9" fill="currentColor" />
          <rect className="brand-bar" x="8.2" y="8" width="1.8" height="8" rx="0.9" fill="currentColor" />
          <rect className="brand-bar" x="11.2" y="4" width="1.8" height="16" rx="0.9" fill="currentColor" />
          <rect className="brand-bar" x="14.2" y="7" width="1.8" height="10" rx="0.9" fill="currentColor" />
          <rect className="brand-bar" x="17.2" y="5" width="1.8" height="14" rx="0.9" fill="currentColor" />
          <rect className="brand-bar" x="20.2" y="9.5" width="1.8" height="5" rx="0.9" fill="currentColor" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold text-foreground transition-colors group-hover:text-primary">
          rusuh.
        </span>
        <span className="text-[10px] text-muted-foreground">BOOKING TIKET</span>
      </div>
    </Link>
  );
}
