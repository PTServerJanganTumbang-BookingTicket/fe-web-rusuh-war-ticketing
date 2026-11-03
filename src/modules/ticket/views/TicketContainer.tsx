"use client";

import { useEffect, useState } from "react";
import { ScreenLoading } from "@/core/views/ScreenLoading";
import { t } from "@/core/i18n/t.utils";
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
    return <ScreenLoading />;
  }

  return <TicketContent />;
}

function TicketContent() {
  const { tickets, isLoading, error } = useMyTicketsController();
  const ticketCards = tickets.map(toTicketCardProps);

  const getErrorMessage = (): string | undefined => {
    if (error?.kind === "api" && error.code === "UNAUTHENTICATED") return t("ticket.error.UNAUTHENTICATED");
    if (error) return t("ticket.error");
    if (isLoading && tickets.length === 0) return t("common.loading");
    return undefined;
  };

  return (
    <MyTicketsView
      nav={{
        items: [
          { label: t("home.nav.explore"), href: "/" },
          { label: t("home.nav.myTickets"), href: "/tickets", active: true },
          { label: t("home.nav.help"), href: "/help" },
        ],
        loginHref: "/login",
        loginLabel: t("home.login"),
      }}
      title={t("ticket.title")}
      subtitle={t("ticket.subtitle")}
      tickets={ticketCards}
      footer={{
        copyright: t("home.footer.copyright"),
        tagline: t("home.footer.tagline"),
        infoBanner: t("home.footer.infoBanner"),
      }}
      emptyLabel={t("ticket.empty")}
      errorMessage={getErrorMessage()}
    />
  );
}
