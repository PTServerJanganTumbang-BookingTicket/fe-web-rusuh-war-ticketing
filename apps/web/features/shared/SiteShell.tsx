import { Suspense, type ReactNode } from "react";
import { t } from "@rusuh/i18n";
import { AccountLink, AppShell, NavLinks } from "@rusuh/ui";
import { toAccountLinkProps, toNavLinksProps } from "./siteNav";
import { ActiveNavLinks, CurrentAccountLink } from "./SiteNavClient";

/**
 * Navbar dan footer untuk semua route situs (bukan embed WebView, ADR-0008). Server Component tanpa provider dan data,
 * jadi Home tetap statis (ADR-0007). Bagian yang bergantung URL mengalir lewat Suspense dengan fallback tanpa URL.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      logo={{ href: "/", label: t("shell.logo"), tagline: t("shell.tagline") }}
      navLabel={t("shell.nav.label")}
      nav={
        <Suspense fallback={<NavLinks {...toNavLinksProps(null)} />}>
          <ActiveNavLinks />
        </Suspense>
      }
      account={
        <Suspense fallback={<AccountLink {...toAccountLinkProps(null)} />}>
          <CurrentAccountLink />
        </Suspense>
      }
      footer={{ copyright: t("shell.footer.copyright"), trust: t("shell.footer.trust") }}
    >
      {children}
    </AppShell>
  );
}
