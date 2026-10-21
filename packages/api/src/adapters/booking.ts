import { z } from "zod";
import type { BookingSession } from "@rusuh/core";
import { apiFetch } from "../http/client";

const bookingSessionResponse = z.object({
  eventName: z.string(),
  expiresAt: z.string(),
  serverNow: z.string(),
  maskedNik: z.string(),
  quota: z.object({ max: z.number(), used: z.number(), remaining: z.number() }),
  categories: z.array(
    z.object({ id: z.string(), name: z.string(), priceIdr: z.number(), stock: z.number() }),
  ),
});

export async function getBookingSession(eventId: string): Promise<BookingSession> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}/booking-session`, bookingSessionResponse);
}
