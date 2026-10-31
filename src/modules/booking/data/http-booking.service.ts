import type { HttpClient } from "@/core/data/http/http.client";
import type { BookingProtocol } from "../domain/booking.protocol";
import type { BookingSession } from "../domain/booking-session.model";
import { bookingSessionSchema } from "./booking-session.schema";

export function createHttpBookingService({ httpClient }: { httpClient: HttpClient }): BookingProtocol {
  return {
    getSession(eventId: string): Promise<BookingSession> {
      return httpClient.get(`/events/${encodeURIComponent(eventId)}/booking-session`, bookingSessionSchema);
    },
  };
}
