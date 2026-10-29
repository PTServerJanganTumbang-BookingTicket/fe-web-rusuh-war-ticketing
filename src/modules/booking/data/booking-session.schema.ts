import { z } from "zod";
import type { BookingSession } from "../domain/booking-session.model";

/** Response `GET /events/{id}/booking-session`. */
export const bookingSessionSchema = z.object({
  eventName: z.string(),
  expiresAt: z.string(),
  serverNow: z.string(),
  maskedNik: z.string(),
  quota: z.object({ max: z.number(), used: z.number(), remaining: z.number() }),
  categories: z.array(
    z.object({ id: z.string(), name: z.string(), priceIdr: z.number(), stock: z.number() }),
  ),
}) satisfies z.ZodType<BookingSession>;
