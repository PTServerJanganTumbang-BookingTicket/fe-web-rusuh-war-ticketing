import { z } from "zod";

// KONTRAK-ASUMSI: GET /events/{eventId}/booking-session
export const bookingSessionResponse = z.object({
  eventName: z.string(),
  expiresAt: z.string(),
  serverNow: z.string(),
  maskedNik: z.string(),
  quota: z.object({ max: z.number(), used: z.number(), remaining: z.number() }),
  categories: z.array(z.object({ id: z.string(), name: z.string(), priceIdr: z.number(), stock: z.number() })),
});

export type BookingSessionResponseDto = z.output<typeof bookingSessionResponse>;
