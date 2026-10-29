// Home. Requirement: FR-01–05. Wireframe 9.1. ADR-0007 (static + ISR).
import { t } from "@/core/i18n/t.utils";
import type { CatalogDependencies } from "../application/catalog.dependencies";
import { toEventCardProps } from "./event-card.mapper";
import type { HomeViewProps } from "../views/HomeView";

/**
 * Controller sisi server untuk Home. Home adalah Server Component statis, jadi tidak memakai hook (ADR-0003).
 * Kebijakan cache (`use cache`, `cacheLife`) milik route di `app/`, bukan di sini.
 */
export async function loadHomeViewProps({ listEventsUseCase }: CatalogDependencies): Promise<HomeViewProps> {
  const base = {
    title: t("home.title"),
    login: { label: t("home.login"), href: "/login" },
    listLabel: t("home.list.label"),
    emptyLabel: t("home.empty"),
  };
  try {
    return { ...base, events: (await listEventsUseCase.execute()).map(toEventCardProps) };
  } catch {
    return { ...base, events: [], errorMessage: t("home.error") };
  }
}
