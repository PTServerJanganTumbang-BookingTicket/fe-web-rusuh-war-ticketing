import { z } from "zod";

/**
 * Zod schemas untuk ticket API responses.
 * Ref: API Contract - GET /users/me/tickets, GET /tickets/{id}/eticket
 */

const ticketStatusSchema = z.enum(["ISSUED", "USED", "CANCELLED", "EXPIRED"]);

const eventSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  venue: z.string(),
  imageUrl: z.string().optional(),
});

export const ticketSummarySchema = z.object({
  id: z.string(),
  event: eventSummarySchema,
  category: z.string(),
  seatNumber: z.string().optional(),
  nikMasked: z.string(),
  holderName: z.string(),
  status: ticketStatusSchema,
  issuedAt: z.string(),
});

export const myTicketsResponseSchema = z.object({
  tickets: z.array(ticketSummarySchema),
  total: z.number(),
});

export const eTicketSchema = z.object({
  id: z.string(),
  event: eventSummarySchema,
  category: z.string(),
  priceIdr: z.number(),
  seatNumber: z.string().optional(),
  nik: z.string(),
  holderName: z.string(),
  holderEmail: z.string(),
  status: ticketStatusSchema,
  qrCode: z.string(),
  qrValue: z.string(),
  instructions: z.string(),
  issuedAt: z.string(),
  bookingId: z.string(),
});

export type TicketSummaryDto = z.infer<typeof ticketSummarySchema>;
export type MyTicketsResponseDto = z.infer<typeof myTicketsResponseSchema>;
export type ETicketDto = z.infer<typeof eTicketSchema>;
