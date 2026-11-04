"use client";

/**
 * Ticket Controllers — client-side hooks for ticket module.
 * Requirement: 7.1 (e-tiket berisi NIK_Attendee, kategori, nomor bangku, QR code).
 * ADR-0004 (TanStack Query).
 */

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { StatusViewProps } from "@/components/ui/layout/StatusView";
import type { TicketDependencies } from "../application/ticket.dependencies";
import type { TicketSummary } from "../domain/ticket.model";
import type { ETicketViewProps } from "../views/ETicketView";
import { myTicketsQueryOptions, eticketQueryOptions } from "./ticket.queries";
import { toETicketViewProps } from "./ticket.mapper";

/**
 * State untuk My Tickets page.
 */
export type MyTicketsControllerState = {
  /** List of user's tickets */
  tickets: TicketSummary[];
  /** Total count of tickets */
  total: number;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: AppError | null;
  /** Refetching state */
  isRefetching: boolean;
};

/**
 * Controller untuk My Tickets page.
 * Fetches all tickets owned by the logged-in user.
 *
 * @example
 * ```tsx
 * function MyTicketsPage() {
 *   const { tickets, isLoading, error } = useMyTicketsController();
 *   if (isLoading) return <Loading />;
 *   if (error) return <ErrorView error={error} />;
 *   return <MyTicketsView tickets={tickets.map(toTicketCardProps)} />;
 * }
 * ```
 */
export function useMyTicketsController(): MyTicketsControllerState {
  const { getMyTicketsUseCase } = useDependencies<TicketDependencies>();

  const query = useQuery(myTicketsQueryOptions({ getMyTicketsUseCase }));

  return {
    tickets: query.data?.tickets ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error ? toAppError(query.error) : null,
    isRefetching: query.isRefetching,
  };
}

/** Layar detail tiket: memuat, galat dengan aksi, atau siap. */
export type TicketDetailScreen =
  { kind: "ready"; view: ETicketViewProps } | { kind: "status"; view: StatusViewProps };

function detailErrorKey(error: AppError): MessageKey {
  if (error.kind === "network") return "ticket.detail.error.network";
  if (error.kind === "api" && error.code === "UNAUTHENTICATED") return "ticket.detail.error.UNAUTHENTICATED";
  if (error.kind === "api" && error.code === "TICKET_NOT_FOUND")
    return "ticket.detail.error.TICKET_NOT_FOUND";
  return "ticket.detail.error.unknown";
}

/**
 * Detail tiket yang sudah dibeli (`/tickets/[ticketId]`). Pemilik yang masuk memakai sesi akun; tautan email
 * membawa `?t=` (FR-26). Requirement 7.1.
 */
export function useTicketDetailController(ticketId: string, accessToken?: string): TicketDetailScreen {
  const siteChrome = useSiteChrome();
  const router = useRouter();
  const { getTicketUseCase } = useDependencies<TicketDependencies>();
  const query = useQuery({
    ...eticketQueryOptions({ getTicketUseCase, ticketId, accessToken }),
    retry: false,
  });

  if (query.data) return { kind: "ready", view: toETicketViewProps(query.data, siteChrome) };
  if (query.isError) {
    const error = toAppError(query.error);
    const signedOut = error.kind === "api" && error.code === "UNAUTHENTICATED";
    return {
      kind: "status",
      view: {
        title: t("ticket.detail.error.title"),
        message: t(detailErrorKey(error)),
        tone: "error",
        action: signedOut
          ? { label: t("ticket.detail.login"), onClick: () => router.push("/login") }
          : { label: t("ticket.detail.retry"), onClick: () => void query.refetch() },
      },
    };
  }
  return {
    kind: "status",
    view: { title: t("ticket.eticket.title"), message: t("ticket.detail.loading"), tone: "neutral" },
  };
}
