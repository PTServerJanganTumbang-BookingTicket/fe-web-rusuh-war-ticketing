import type { SessionAccount } from "@/core/domain/session-account.model";
import { t } from "@/core/i18n/t.utils";

export type NavAccount = { label: string; initials: string; href: string; ariaLabel: string };

/** Navbar dan footer situs, sama dengan Home. Bentuknya cocok dengan `SiteShellProps` tanpa `children`. */
export type SiteChrome = {
  nav: {
    items: { label: string; href: string; active?: boolean }[];
    loginHref: string;
    loginLabel: string;
    /** Ada saat customer masuk: navbar menampilkan akun, bukan tombol masuk. */
    account?: NavAccount;
  };
  footer: { copyright: string; tagline: string };
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
}: { account?: SessionAccount | null; active?: string } = {}): SiteChrome {
  return {
    nav: {
      items: [
        { label: t("home.nav.explore"), href: "/" },
        { label: t("home.nav.myTickets"), href: "/tickets" },
        { label: t("home.nav.help"), href: "/help" },
      ].map((item) => (item.href === active ? { ...item, active: true } : item)),
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
    },
    footer: { copyright: t("home.footer.copyright"), tagline: t("home.footer.tagline") },
  };
}
