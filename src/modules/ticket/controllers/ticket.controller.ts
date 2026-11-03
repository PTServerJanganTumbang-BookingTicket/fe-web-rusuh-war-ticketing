"use client";

/**
 * Ticket Controllers — client-side hooks for ticket module.
 * Requirement: 7.1 (e-tiket berisi NIK_Attendee, kategori, nomor bangku, QR code).
 * ADR-0004 (TanStack Query).
 */

import { useQuery } from "@tanstack/react-query";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { toAppError, type AppError } from "@/core/domain/app-error";
import type { TicketDependencies } from "../application/ticket.dependencies";
import type { TicketSummary, ETicket } from "../domain/ticket.model";
import { myTicketsQueryOptions, eticketQueryOptions } from "./ticket.queries";

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
 * State untuk E-Ticket detail page.
 */
export type ETicketControllerState = {
  /** E-ticket data with QR code */
  eticket: ETicket | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: AppError | null;
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

/**
 * Controller untuk E-Ticket detail page.
 * Fetches single e-ticket with QR code.
 *
 * @param ticketId - ID of the ticket to fetch
 * @param accessToken - Optional access token for email link access (query param ?t=)
 *
 * @example
 * ```tsx
 * function ETicketPage({ params, searchParams }) {
 *   const { eticket, isLoading, error } = useETicketController(params.id, searchParams.t);
 *   if (isLoading) return <Loading />;
 *   if (error) return <ErrorView error={error} />;
 *   return <ETicketView {...toETicketViewProps(eticket)} />;
 * }
 * ```
 */
export function useETicketController(ticketId: string, accessToken?: string): ETicketControllerState {
  const { getTicketUseCase } = useDependencies<TicketDependencies>();

  const query = useQuery(
    eticketQueryOptions({
      getTicketUseCase,
      ticketId,
      accessToken,
    }),
  );

  return {
    eticket: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? toAppError(query.error) : null,
  };
}
