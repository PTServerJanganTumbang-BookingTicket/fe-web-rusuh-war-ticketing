import { t } from "@/core/i18n/t.utils";

/** Navbar dan footer situs, sama dengan Home. Bentuknya cocok dengan `SiteShellProps` tanpa `children`. */
export type SiteChrome = {
  nav: { items: { label: string; href: string; active?: boolean }[]; loginHref: string; loginLabel: string };
  footer: { copyright: string; tagline: string };
};

export function toSiteChrome(): SiteChrome {
  return {
    nav: {
      items: [
        { label: t("home.nav.explore"), href: "/" },
        { label: t("home.nav.myTickets"), href: "/tickets" },
        { label: t("home.nav.help"), href: "/help" },
      ],
      loginHref: "/login",
      loginLabel: t("home.login"),
    },
    footer: { copyright: t("home.footer.copyright"), tagline: t("home.footer.tagline") },
  };
}
