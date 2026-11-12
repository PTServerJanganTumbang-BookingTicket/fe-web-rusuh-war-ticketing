"use client";

import { legalLinks } from "@/core/controllers/site-chrome.utils";

import { useEffect, useState } from "react";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { useHomeController } from "../controllers/home.controller";
import { toEventCardProps } from "../controllers/event-card.mapper";
import { HOME_EVENT_LIMIT } from "../domain/catalog.constants";
import { latestEvents } from "../domain/event.rules";
import { HomeView } from "./HomeView";

export function CatalogContainer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration fix: ensure SSR/client consistency
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!mounted) {
    return <ScreenLoading label={t("common.loading")} variant="list" />;
  }

  return <CatalogContent />;
}

function CatalogContent() {
  const { events, isLoading, error, isRefetching, refetch } = useHomeController();
  const { nav } = useSiteChrome({ active: "/" });
  const eventCards = latestEvents(events, HOME_EVENT_LIMIT).map(toEventCardProps);

  const getErrorMessage = (): string | undefined => {
    if (error) return t("home.error");
    return undefined;
  };

  return (
    <HomeView
      nav={nav}
      hero={{
        eyebrow: t("home.hero.eyebrow"),
        headline: t("home.hero.headline"),
        subtext: t("home.hero.subtext"),
        cta: t("home.hero.cta"),
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
        links: legalLinks(),
      }}
      emptyLabel={t("home.empty")}
      categoryFilter={{
        label: t("home.filter.label"),
        all: t("home.filter.all"),
        empty: t("home.filter.empty"),
      }}
      viewAll={{ label: t("home.viewAll"), href: "/events" }}
      retry={{
        label: t(isRefetching ? "home.retrying" : "home.retry"),
        busy: isRefetching,
        onClick: refetch,
      }}
      errorMessage={getErrorMessage()}
      loading={isLoading && events.length === 0 && !error ? t("common.loading") : undefined}
    />
  );
}
