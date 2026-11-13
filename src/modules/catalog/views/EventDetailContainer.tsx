"use client";

import { useEffect, useState } from "react";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { StatusView } from "@/components/ui/layout/StatusView";
import { t } from "@/core/i18n/t.utils";
import { useEventDetailController } from "../controllers/event-detail.controller";
import { EventDetailStatusView } from "./EventDetailStatusView";
import { EventDetailView } from "./EventDetailView";

export function EventDetailContainer({ eventId }: { eventId: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Hydration fix, sama dengan CatalogContainer: bahasa dan sesi baru diketahui di browser.
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  if (!mounted) return <ScreenLoading label={t("common.loading")} variant="page" />;
  return <EventDetailContent eventId={eventId} />;
}

function EventDetailContent({ eventId }: { eventId: string }) {
  const screen = useEventDetailController(eventId);
  if (screen.kind === "ready") return <EventDetailView {...screen.view} />;
  if (screen.kind === "loading") {
    return (
      <StatusView
        tone="neutral"
        skeleton="page"
        title={screen.view.label}
        nav={screen.view.nav}
        footer={screen.view.footer}
      />
    );
  }
  return <EventDetailStatusView {...screen.view} />;
}
