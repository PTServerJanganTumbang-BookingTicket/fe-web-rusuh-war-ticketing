import { z } from "zod";
import type { HttpClient } from "@/platform/http/HttpClient";
import type { BookingRepository } from "../application/BookingRepository";
import type { BookingSession } from "../domain/bookingSession";

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

export class HttpBookingRepository implements BookingRepository {
  private readonly httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }

  getSession(eventId: string): Promise<BookingSession> {
    return this.httpClient.get(
      `/events/${encodeURIComponent(eventId)}/booking-session`,
      bookingSessionResponse,
    );
  }
}
