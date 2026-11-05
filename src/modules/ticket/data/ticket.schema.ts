import { z } from "zod";
import type { ETicket, MyTicketsResult, TicketStatus } from "../domain/ticket.model";

/**
 * Zod schemas untuk ticket API responses (kontrak: GET /users/me/tickets, GET /tickets/{id}/eticket).
 * Kontrak tidak mengirim nama pemegang, email, harga e-tiket, atau waktu terbit; field domain itu diisi kosong
 * sampai model tiket diselaraskan (tasks.md 30).
 */

/** `VALID` di kontrak sama dengan tiket aktif (`ISSUED`) di domain. */
const ticketStatusSchema = z
  .enum(["VALID", "USED", "EXPIRED", "CANCELLED"])
  .transform((status): TicketStatus => (status === "VALID" ? "ISSUED" : status));

const ticketSummarySchema = z.object({
  ticket_id: z.string(),
  booking_id: z.string(),
  event: z.object({
    id: z.string(),
    name: z.string(),
    date: z.string(),
    venue: z.string(),
    image_url: z.string().optional(),
  }),
  category: z.string(),
  status: ticketStatusSchema,
});

/** `data` dari `GET /users/me/tickets`; total diambil dari jumlah item (pagination ada di `meta`). */
export const myTicketsResponseSchema = z.array(ticketSummarySchema).transform((tickets): MyTicketsResult => ({
  tickets: tickets.map((ticket) => ({
    id: ticket.ticket_id,
    event: {
      id: ticket.event.id,
      name: ticket.event.name,
      date: ticket.event.date,
      venue: ticket.event.venue,
      imageUrl: ticket.event.image_url,
    },
    category: ticket.category,
    nikMasked: "",
    holderName: "",
    status: ticket.status,
    issuedAt: "",
  })),
  total: tickets.length,
}));

/** `data` dari `GET /tickets/{ticket_id}/eticket`. ID event dibaca dari `qr_value` (`TKT|event|NIK`). */
export const eTicketSchema = z
  .object({
    ticket_id: z.string(),
    event: z.object({ name: z.string(), date: z.string(), time: z.string(), venue: z.string() }),
    category: z.string(),
    holder: z.object({ nik_masked: z.string() }),
    qr_code: z.string(),
    qr_value: z.string(),
    instructions: z.string(),
  })
  .transform((ticket): ETicket => ({
    id: ticket.ticket_id,
    event: {
      id: ticket.qr_value.split("|")[1] ?? "",
      name: ticket.event.name,
      date: ticket.event.date,
      time: ticket.event.time,
      venue: ticket.event.venue,
    },
    category: ticket.category,
    priceIdr: 0,
    nik: ticket.holder.nik_masked,
    holderName: "",
    holderEmail: "",
    status: "ISSUED",
    qrCode: ticket.qr_code,
    qrValue: ticket.qr_value,
    instructions: ticket.instructions,
    issuedAt: "",
    bookingId: "",
  }));
