"use client";

import { legalLinks } from "@/core/controllers/site-chrome.utils";

import { useEffect, useState } from "react";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { useMyTicketsController } from "../controllers/ticket.controller";
import { toTicketCardProps } from "../controllers/ticket.mapper";
import { MyTicketsView } from "./MyTicketsView";

/**
 * Container for My Tickets page.
 * Connects controller to view with hydration handling.
 */
export function TicketContainer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration fix: ensure SSR/client consistency
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!mounted) {
    return <ScreenLoading label={t("common.loading")} variant="list" />;
  }

  return <TicketContent />;
}

function TicketContent() {
  const { tickets, isLoading, error } = useMyTicketsController();
  const { nav } = useSiteChrome({ active: "/tickets" });
  const ticketCards = tickets.map(toTicketCardProps);

  const getErrorMessage = (): string | undefined => {
    if (error?.kind === "api" && error.code === "UNAUTHENTICATED") return t("ticket.error.UNAUTHENTICATED");
    if (error) return t("ticket.error");
    return undefined;
  };

  return (
    <MyTicketsView
      nav={nav}
      title={t("ticket.title")}
      subtitle={t("ticket.subtitle")}
      tickets={ticketCards}
      footer={{
        copyright: t("home.footer.copyright"),
        tagline: t("home.footer.tagline"),
        infoBanner: t("home.footer.infoBanner"),
        links: legalLinks(),
      }}
      emptyLabel={t("ticket.empty")}
      errorMessage={getErrorMessage()}
      loading={isLoading && tickets.length === 0 && !error ? t("common.loading") : undefined}
    />
  );
}
