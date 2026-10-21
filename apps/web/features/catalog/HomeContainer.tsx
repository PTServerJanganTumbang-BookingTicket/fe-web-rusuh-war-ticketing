// Home. Requirement: FR-01–05. Wireframe 9.1. ADR-0007 (static + ISR).
import { cacheLife } from "next/cache";
import { listEvents } from "@rusuh/api";
import { t } from "@rusuh/i18n";
import { HomeView, type HomeViewProps } from "@rusuh/ui";
import { toEventCardProps } from "./toEventCardProps";

async function loadHomeProps(): Promise<HomeViewProps> {
  "use cache";
  // ISR pendek (ADR-0007). stale ≥ 30 dtk dan expire ≥ 5 mnt agar tetap masuk static shell.
  cacheLife({ stale: 60, revalidate: 15, expire: 600 });

  const base = {
    title: t("home.title"),
    login: { label: t("home.login"), href: "/login" },
    listLabel: t("home.list.label"),
    emptyLabel: t("home.empty"),
  };
  try {
    return { ...base, events: (await listEvents()).map(toEventCardProps) };
  } catch {
    return { ...base, events: [], errorMessage: t("home.error") };
  }
}

// Home adalah Server Component statis, jadi tidak memakai hook ViewModel (ADR-0003, ADR-0007).
export async function HomeContainer() {
  return <HomeView {...await loadHomeProps()} />;
}
