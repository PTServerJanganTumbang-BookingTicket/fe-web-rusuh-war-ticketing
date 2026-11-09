import { queryOptions } from "@tanstack/react-query";
import { toAppError } from "@/core/domain/app-error";
import type { GetMyTicketsUseCase } from "../application/get-my-tickets.use-case";
import type { GetTicketUseCase } from "../application/get-ticket.use-case";

/**
 * Query keys untuk ticket module.
 */
export const ticketKeys = {
  all: ["ticket"] as const,
  myTickets: () => [...ticketKeys.all, "my-tickets"] as const,
  eticket: (ticketId: string) => [...ticketKeys.all, "eticket", ticketId] as const,
};

/**
 * Query options untuk my tickets list.
 */
export function myTicketsQueryOptions({ getMyTicketsUseCase }: { getMyTicketsUseCase: GetMyTicketsUseCase }) {
  return queryOptions({
    queryKey: ticketKeys.myTickets(),
    queryFn: getMyTicketsUseCase,
    staleTime: 30_000, // 30 seconds
    // Tamu (401) tidak perlu dicoba ulang: tampilkan ajakan masuk segera.
    retry: (failureCount, error) => {
      const appError = toAppError(error);
      return !(appError.kind === "api" && appError.code === "UNAUTHENTICATED") && failureCount < 2;
    },
  });
}

/**
 * Query options untuk single e-ticket.
 */
export function eticketQueryOptions({
  getTicketUseCase,
  ticketId,
  accessToken,
}: {
  getTicketUseCase: GetTicketUseCase;
  ticketId: string;
  accessToken?: string;
}) {
  return queryOptions({
    queryKey: ticketKeys.eticket(ticketId),
    queryFn: () => getTicketUseCase(ticketId, accessToken),
    staleTime: 60_000, // 1 minute - e-ticket data rarely changes
  });
}
