import type { HttpClient } from "@/core/data/http/http.client";
import type { TicketProtocol } from "../domain/ticket.protocol";
import type { ETicket, MyTicketsResult } from "../domain/ticket.model";
import { myTicketsResponseSchema, eTicketSchema } from "./ticket.schema";

/**
 * HTTP implementation of TicketProtocol.
 * Endpoints: GET /users/me/tickets, GET /tickets/{id}/eticket
 */
export function createHttpTicketService({
  httpClient,
  bffHttpClient,
}: {
  httpClient: HttpClient;
  bffHttpClient: HttpClient;
}): TicketProtocol {
  return {
    async getMyTickets(): Promise<MyTicketsResult> {
      // Butuh sesi akun: lewat route same-origin yang menambahkan Bearer dari cookie httpOnly (ADR-0023).
      return bffHttpClient.get("/account/tickets", myTicketsResponseSchema, {
        errorCodes: { 401: "UNAUTHENTICATED" },
      });
    },

    async getETicket(ticketId: string, accessToken?: string): Promise<ETicket> {
      const id = encodeURIComponent(ticketId);
      // Dari email (FR-26): token `?t=` langsung ke BE. Pemilik yang masuk: lewat route same-origin dengan Bearer.
      if (accessToken) {
        return httpClient.get(`/tickets/${id}/eticket?t=${encodeURIComponent(accessToken)}`, eTicketSchema, {
          errorCodes: { 401: "UNAUTHENTICATED", 404: "TICKET_NOT_FOUND" },
        });
      }
      return bffHttpClient.get(`/account/tickets/${id}/eticket`, eTicketSchema, {
        errorCodes: { 401: "UNAUTHENTICATED", 404: "TICKET_NOT_FOUND" },
      });
    },
  };
}
