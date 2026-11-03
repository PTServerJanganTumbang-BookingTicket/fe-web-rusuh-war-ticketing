import { z } from "zod";
import type { BookingSession } from "../domain/booking-session.model";

/**
 * `data` dari `GET /events/{event_id}/tickets`. Kontrak tidak membawa NIK akun maupun kuota terpakai:
 * login opsional dan batasnya per transaksi (BR-01, BR-02), jadi kuota = `max_tickets_per_order`.
 */
export const bookingSessionSchema = z
  .object({
    event: z.object({ name: z.string() }),
    session: z.object({ expires_at: z.string(), server_time: z.string() }),
    categories: z.array(
      z.object({ id: z.string(), name: z.string(), price: z.number(), available: z.number() }),
    ),
    rules: z.object({ max_tickets_per_order: z.number() }),
  })
  .transform((response): BookingSession => ({
    eventName: response.event.name,
    expiresAt: response.session.expires_at,
    serverNow: response.session.server_time,
    maskedNik: null,
    quota: {
      max: response.rules.max_tickets_per_order,
      used: 0,
      remaining: response.rules.max_tickets_per_order,
    },
    categories: response.categories.map((category) => ({
      id: category.id,
      name: category.name,
      priceIdr: category.price,
      stock: category.available,
    })),
  }));
