import type { ETicket } from "../domain/ticket.model";
import type { TicketProtocol } from "../domain/ticket.protocol";

export type GetTicketUseCase = (ticketId: string, accessToken?: string) => Promise<ETicket>;

/**
 * Use case untuk mengambil detail e-ticket dengan QR code.
 * Endpoint: GET /tickets/{ticketId}/eticket
 *
 * @param ticketId - ID tiket
 * @param accessToken - Optional token untuk akses dari email link
 */
export function createGetTicketUseCase({
  ticketService,
}: {
  ticketService: TicketProtocol;
}): GetTicketUseCase {
  return (ticketId, accessToken) => ticketService.getETicket(ticketId, accessToken);
}
