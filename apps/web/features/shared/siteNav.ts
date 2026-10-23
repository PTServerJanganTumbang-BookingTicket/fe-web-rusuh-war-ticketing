import { t } from "@rusuh/i18n";
import type { AccountLinkProps, NavLinksProps } from "@rusuh/ui";

const NAV = [
  { key: "shell.nav.events", href: "/" },
  { key: "shell.nav.tickets", href: "/tiket" },
  { key: "shell.nav.help", href: "/bantuan" },
] as const;

/** Halaman event (antrian, booking) dan order termasuk "Jelajahi event". */
function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/events/") || pathname.startsWith("/orders/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** `null` saat URL belum diketahui (fallback prerender): tidak ada tautan aktif. */
export function toNavLinksProps(pathname: string | null): NavLinksProps {
  return { items: NAV.map((item) => ({ label: t(item.key), href: item.href, active: pathname !== null && isActive(item.href, pathname) })) };
}

const AUTH_PAGES = /^\/(login|register|auth)(?=$|\/)/;

/** Login kembali ke halaman saat ini, kecuali dari Home atau halaman auth (ADR-0010, resolveReturnTo). */
export function toAccountLinkProps(pathname: string | null): AccountLinkProps {
  const returnTo = pathname && pathname !== "/" && !AUTH_PAGES.test(pathname) ? pathname : undefined;
  return { label: t("shell.login"), href: returnTo ? `/login?${new URLSearchParams({ returnTo })}` : "/login" };
}
