import type { HttpClient } from "@/core/data/http/http.client";
import type { BookingProtocol } from "../domain/booking.protocol";
import type { BookingSession } from "../domain/booking-session.model";
import { bookingSessionSchema } from "./booking-session.schema";

export class HttpBookingService implements BookingProtocol {
  private readonly httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }

  getSession(eventId: string): Promise<BookingSession> {
    return this.httpClient.get(
      `/events/${encodeURIComponent(eventId)}/booking-session`,
      bookingSessionSchema,
    );
  }
}
