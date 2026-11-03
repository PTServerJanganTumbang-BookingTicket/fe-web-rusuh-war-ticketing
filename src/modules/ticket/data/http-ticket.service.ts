import type { HttpClient } from "@/core/data/http/http.client";
import type { TicketProtocol } from "../domain/ticket.protocol";
import type { ETicket, MyTicketsResult } from "../domain/ticket.model";
import { myTicketsResponseSchema, eTicketSchema } from "./ticket.schema";

/**
 * HTTP implementation of TicketProtocol.
 * Endpoints: GET /users/me/tickets, GET /tickets/{id}/eticket
 */
export function createHttpTicketService({ httpClient }: { httpClient: HttpClient }): TicketProtocol {
  return {
    async getMyTickets(): Promise<MyTicketsResult> {
      return httpClient.get("/users/me/tickets", myTicketsResponseSchema);
    },

    async getETicket(ticketId: string, accessToken?: string): Promise<ETicket> {
      const url = accessToken
        ? `/tickets/${ticketId}/eticket?t=${encodeURIComponent(accessToken)}`
        : `/tickets/${ticketId}/eticket`;

      return httpClient.get(url, eTicketSchema);
    },
  };
}
