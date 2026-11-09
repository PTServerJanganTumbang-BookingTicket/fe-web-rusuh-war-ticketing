import type { SessionAccount } from "@/core/domain/session-account.model";
import { t } from "@/core/i18n/t.utils";
import { isLocale, LOCALES, type Locale } from "@/core/i18n/locale.utils";

export type NavAccount = { label: string; initials: string; href: string; ariaLabel: string };

/**
 * Pengganti bahasa di navbar. Kode bahasa pendek (`ID`, `EN`) tampil di tombol, nama lengkap di pilihan. Nilainya
 * string biasa karena design system tidak mengenal `Locale`; nilai asing diabaikan.
 */
export type NavLanguage = {
  label: string;
  value: string;
  options: { value: string; label: string; short: string }[];
  onChange: (value: string) => void;
};

/** Tautan dokumen hukum di footer dan di bawah persetujuan register. */
export function legalLinks() {
  return [
    { label: t("home.footer.terms"), href: "/terms" },
    { label: t("home.footer.privacy"), href: "/privacy" },
  ];
}

/** Navbar dan footer situs, sama dengan Home. Bentuknya cocok dengan `SiteShellProps` tanpa `children`. */
export type SiteChrome = {
  nav: {
    items: { label: string; href: string; active?: boolean }[];
    loginHref: string;
    loginLabel: string;
    /** Ada saat customer masuk: navbar menampilkan akun, bukan tombol masuk. */
    account?: NavAccount;
    /** Ada saat layar bisa berganti bahasa (client). */
    language?: NavLanguage;
    menu?: { label: string; closeLabel: string };
  };
  footer: { copyright: string; tagline: string; links: { label: string; href: string }[] };
};

/** Huruf awal untuk avatar: "budi.santoso@x.co" → "BS". */
export function initialsOf(text: string): string {
  return text
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/** Bagian email sebelum `@` sebagai nama pendek di navbar. */
function shortName(email: string): string {
  return email.split("@")[0] || email;
}

export function toSiteChrome({
  account,
  active,
  locale,
  onLocaleChange,
}: {
  account?: SessionAccount | null;
  active?: string;
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
} = {}): SiteChrome {
  return {
    nav: {
      items: [
        { label: t("home.nav.explore"), href: "/" },
        { label: t("home.nav.myTickets"), href: "/tickets" },
        { label: t("home.nav.help"), href: "/help" },
      ].map((item) => (item.href === active ? { ...item, active: true } : item)),
      menu: { label: t("nav.menu"), closeLabel: t("nav.menu.close") },
      loginHref: "/login",
      loginLabel: t("home.login"),
      account: account
        ? {
            label: shortName(account.email),
            initials: initialsOf(account.email),
            href: "/account",
            ariaLabel: t("nav.account", { email: account.email }),
          }
        : undefined,
      language:
        locale && onLocaleChange
          ? {
              label: t("nav.language.label"),
              value: locale,
              options: LOCALES.map((value) => ({
                value,
                label: t(`nav.language.${value}`),
                short: value.toUpperCase(),
              })),
              onChange: (value: string) => {
                if (isLocale(value)) onLocaleChange(value);
              },
            }
          : undefined,
    },
    footer: { copyright: t("home.footer.copyright"), tagline: t("home.footer.tagline"), links: legalLinks() },
  };
}
