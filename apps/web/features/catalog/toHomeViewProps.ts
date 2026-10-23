import { t } from "@rusuh/i18n";
import type { HomeViewProps } from "@rusuh/ui";
import type { HomeScreenState } from "./loadHome";
import { toEventCardProps } from "./toEventCardProps";

export function toHomeViewProps(state: HomeScreenState): HomeViewProps {
  const base = {
    hero: { eyebrow: t("home.hero.eyebrow"), title: t("home.hero.title"), subtitle: t("home.hero.subtitle") },
    listLabel: t("home.list.label"),
    listDescription: t("home.list.description"),
    emptyLabel: t("home.empty"),
  };
  return state.kind === "ready"
    ? { ...base, events: state.events.map(toEventCardProps) }
    : { ...base, events: [], errorMessage: t("home.error") };
}
