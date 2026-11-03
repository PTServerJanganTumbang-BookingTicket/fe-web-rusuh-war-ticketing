import type { MyTicketsResult } from "../domain/ticket.model";
import type { TicketProtocol } from "../domain/ticket.protocol";

export type GetMyTicketsUseCase = () => Promise<MyTicketsResult>;

/**
 * Use case untuk mengambil daftar tiket milik user.
 * Endpoint: GET /users/me/tickets
 */
export function createGetMyTicketsUseCase({
  ticketService,
}: {
  ticketService: TicketProtocol;
}): GetMyTicketsUseCase {
  return () => ticketService.getMyTickets();
}
