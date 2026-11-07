"use client";

import { useEffect, useState } from "react";
import { ScreenLoading } from "@/core/views/ScreenLoading";
import { t } from "@/core/i18n/t.utils";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { useHomeController } from "../controllers/home.controller";
import { toEventCardProps } from "../controllers/event-card.mapper";
import { HomeView } from "./HomeView";

export function CatalogContainer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration fix: ensure SSR/client consistency
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!mounted) {
    return <ScreenLoading />;
  }

  return <CatalogContent />;
}

function CatalogContent() {
  const { events, isLoading, error } = useHomeController();
  const { nav } = useSiteChrome({ active: "/" });
  const eventCards = events.map(toEventCardProps);

  const getErrorMessage = (): string | undefined => {
    if (error) return t("home.error");
    if (isLoading && events.length === 0) return t("common.loading");
    return undefined;
  };

  return (
    <HomeView
      nav={nav}
      hero={{
        eyebrow: t("home.hero.eyebrow"),
        headline: t("home.hero.headline"),
        subtext: t("home.hero.subtext"),
      }}
      eventList={{
        title: t("home.list.title"),
        subtitle: t("home.list.subtitle"),
      }}
      events={eventCards}
      footer={{
        copyright: t("home.footer.copyright"),
        tagline: t("home.footer.tagline"),
        infoBanner: t("home.footer.infoBanner"),
      }}
      emptyLabel={t("home.empty")}
      errorMessage={getErrorMessage()}
    />
  );
}
