// Home. Requirement: FR-01–05. Wireframe 9.1. ADR-0007 (static + ISR).
import { t } from "@/ui/i18n/t";
import type { CatalogDependencies } from "../application/dependencies";
import { toEventCardProps } from "./toEventCardProps";
import type { HomeViewProps } from "./views/HomeView";

/**
 * "ViewModel" server untuk Home. Home adalah Server Component statis, jadi tidak memakai hook (ADR-0003).
 * Kebijakan cache (`use cache`, `cacheLife`) milik route di `app/`, bukan di sini.
 */
export async function loadHomeViewProps({ listEvents }: CatalogDependencies): Promise<HomeViewProps> {
  const base = {
    title: t("home.title"),
    login: { label: t("home.login"), href: "/login" },
    listLabel: t("home.list.label"),
    emptyLabel: t("home.empty"),
  };
  try {
    return { ...base, events: (await listEvents.execute()).map(toEventCardProps) };
  } catch {
    return { ...base, events: [], errorMessage: t("home.error") };
  }
}
