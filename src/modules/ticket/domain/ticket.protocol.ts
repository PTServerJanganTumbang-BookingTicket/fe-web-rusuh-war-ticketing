import type { ETicket, MyTicketsResult } from "./ticket.model";

/**
 * Protocol untuk mengakses data tiket.
 * Ref: API Contract - ticket module endpoints.
 * Clean Architecture: Dependency inversion interface (domain layer).
 */
export interface TicketProtocol {
  /**
   * Mengambil daftar tiket milik user yang sedang login.
   * Endpoint: GET /users/me/tickets
   * Auth: Bearer Token (Cookie)
   */
  getMyTickets(): Promise<MyTicketsResult>;

  /**
   * Mengambil detail e-ticket lengkap dengan QR code.
   * Endpoint: GET /tickets/{ticketId}/eticket
   * Auth: Bearer Token atau Query param ?t= (untuk akses dari email)
   *
   * @param ticketId - ID tiket
   * @param accessToken - Optional token untuk akses dari email link
   */
  getETicket(ticketId: string, accessToken?: string): Promise<ETicket>;
}
