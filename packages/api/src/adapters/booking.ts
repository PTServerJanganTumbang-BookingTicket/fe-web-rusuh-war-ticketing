import type { BookingSession } from "@rusuh/core";
import { bookingSessionResponse } from "../contracts/booking";
import { apiFetch } from "../http/client";
import { toBookingSession } from "../mappers/booking";

export async function getBookingSession(eventId: string): Promise<BookingSession> {
  return toBookingSession(await apiFetch(`/events/${encodeURIComponent(eventId)}/booking-session`, bookingSessionResponse));
}
