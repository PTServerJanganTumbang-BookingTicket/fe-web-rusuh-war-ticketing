"use client";

import { useEffect, useState } from "react";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { t } from "@/core/i18n/t.utils";
import { useHomeController } from "../controllers/home.controller";
import { toEventCardProps } from "../controllers/event-card.mapper";
import { sortByLatest } from "../domain/event.rules";
import { AllEventsView } from "./AllEventsView";

export function AllEventsContainer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Hydration fix, sama dengan CatalogContainer.
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  if (!mounted) return <ScreenLoading label={t("common.loading")} variant="list" />;
  return <AllEventsContent />;
}

function AllEventsContent() {
  const { events, isLoading, error, isRefetching, refetch } = useHomeController();
  const { nav, footer } = useSiteChrome({ active: "/events" });
  return (
    <AllEventsView
      nav={nav}
      title={t("events.title")}
      subtitle={t("events.subtitle")}
      events={sortByLatest(events).map(toEventCardProps)}
      footer={footer}
      grid={{
        filterLabel: t("home.filter.label"),
        allLabel: t("home.filter.all"),
        emptyCategoryLabel: t("home.filter.empty"),
        search: {
          label: t("events.search.label"),
          placeholder: t("events.search.placeholder"),
          empty: t("events.search.empty"),
        },
      }}
      emptyLabel={t("home.empty")}
      retry={{
        label: t(isRefetching ? "home.retrying" : "home.retry"),
        busy: isRefetching,
        onClick: refetch,
      }}
      errorMessage={error ? t("home.error") : undefined}
      loading={isLoading && events.length === 0 && !error ? t("common.loading") : undefined}
    />
  );
}
