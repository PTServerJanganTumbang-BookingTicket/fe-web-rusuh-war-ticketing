// Home. Requirement: FR-01–05. Wireframe 9.1. ADR-0007 (static + ISR).
import { legalLinks } from "@/core/controllers/site-chrome.utils";
import { t } from "@/core/i18n/t.utils";
import type { CatalogDependencies } from "../application/catalog.dependencies";
import { toEventCardProps } from "./event-card.mapper";
import type { HomeViewProps } from "../views/HomeView";

/**
 * Controller sisi server untuk Home. Home adalah Server Component statis, jadi tidak memakai hook (ADR-0003).
 * Kebijakan cache (`use cache`, `cacheLife`) milik route di `app/`, bukan di sini.
 */
export async function loadHomeViewProps({ listEventsUseCase }: CatalogDependencies): Promise<HomeViewProps> {
  const base: Omit<HomeViewProps, "events" | "errorMessage"> = {
    nav: {
      items: [
        { label: t("home.nav.explore"), href: "/", active: true },
        { label: t("home.nav.myTickets"), href: "/tickets" },
        { label: t("home.nav.help"), href: "/help" },
      ],
      loginHref: "/login",
      loginLabel: t("home.login"),
    },
    hero: {
      eyebrow: t("home.hero.eyebrow"),
      headline: t("home.hero.headline"),
      subtext: t("home.hero.subtext"),
    },
    eventList: {
      title: t("home.list.title"),
      subtitle: t("home.list.subtitle"),
    },
    footer: {
      copyright: t("home.footer.copyright"),
      tagline: t("home.footer.tagline"),
      infoBanner: t("home.footer.infoBanner"),
      links: legalLinks(),
    },
    emptyLabel: t("home.empty"),
  };
  try {
    return { ...base, events: (await listEventsUseCase()).map(toEventCardProps) };
  } catch {
    return { ...base, events: [], errorMessage: t("home.error") };
  }
}
