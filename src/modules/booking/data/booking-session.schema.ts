import { z } from "zod";
import type { BookingEvent } from "../domain/booking-event.model";
import type { CreatedBooking, NikCheck } from "../domain/booking-request.model";
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
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().default(""),
        price: z.number(),
        available: z.number(),
      }),
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
      description: category.description,
      priceIdr: category.price,
      stock: category.available,
    })),
  }));

/** `data` dari `GET /events/{event_id}`, hanya bagian yang dipakai kartu event. */
export const bookingEventSchema = z
  .object({
    name: z.string(),
    category: z.string(),
    location: z.object({ venue: z.string(), city: z.string() }),
    date: z.string(),
    image_url: z.string(),
  })
  .transform((event): BookingEvent => ({
    name: event.name,
    category: event.category,
    city: event.location.city,
    venue: event.location.venue,
    date: event.date,
    imageUrl: event.image_url,
  }));

/** `data` dari `POST /nik/validate`. NIK yang sudah dipakai tetap `valid: true` di kontrak, ditandai `already_used`. */
export const nikCheckSchema = z
  .object({
    valid: z.boolean(),
    name: z.string().optional(),
    already_used: z.boolean().optional(),
    reason: z.string().optional(),
  })
  .transform((result): NikCheck => {
    if (result.already_used) return { status: "used" };
    if (result.valid) return { status: "valid", name: result.name ?? "" };
    return result.reason === "NIK_INACTIVE" ? { status: "inactive" } : { status: "not_found" };
  });

/** `data` dari `POST /bookings` (201). Rincian tiket dan TTL dibaca ulang di halaman pembayaran. */
export const createdBookingSchema = z
  .object({ booking_id: z.string() })
  .transform((booking): CreatedBooking => ({ bookingId: booking.booking_id }));
