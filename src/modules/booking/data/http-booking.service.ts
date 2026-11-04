import { grantHeaders } from "@/core/data/credentials/grant-headers.utils";
import type { HttpClient } from "@/core/data/http/http.client";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { BookingEvent } from "../domain/booking-event.model";
import type { CreatedBooking, NikCheck, SubmitBookingInput } from "../domain/booking-request.model";
import type { BookingProtocol } from "../domain/booking.protocol";
import type { BookingSession } from "../domain/booking-session.model";
import {
  bookingEventSchema,
  bookingSessionSchema,
  createdBookingSchema,
  nikCheckSchema,
} from "./booking-session.schema";

export function createHttpBookingService({
  httpClient,
  credentialStore,
}: {
  httpClient: HttpClient;
  credentialStore: CredentialStoreProtocol;
}): BookingProtocol {
  return {
    getSession(eventId: string): Promise<BookingSession> {
      // 401: grant habis, tidak dikenal, atau bukan milik perangkat ini. Semuanya berarti kembali ke antrian.
      return httpClient.get(`/events/${encodeURIComponent(eventId)}/tickets`, bookingSessionSchema, {
        headers: grantHeaders(credentialStore),
        errorCodes: { 401: "ACCESS_EXPIRED" },
      });
    },

    getEvent(eventId: string): Promise<BookingEvent> {
      return httpClient.get(`/events/${encodeURIComponent(eventId)}`, bookingEventSchema);
    },

    validateNik(nik: string): Promise<NikCheck> {
      return httpClient.post("/nik/validate", { nik }, nikCheckSchema, {
        headers: grantHeaders(credentialStore),
        errorCodes: { 400: "NIK_INVALID", 401: "ACCESS_EXPIRED", 429: "RATE_LIMITED" },
      });
    },

    submitBooking(input: SubmitBookingInput): Promise<CreatedBooking> {
      const body = {
        event_id: input.eventId,
        // Kontrak meminta email per tiket untuk pengiriman e-tiket (FR-26); FE memakai email pemesan untuk semua.
        tickets: input.tickets.map((ticket) => ({
          category_id: ticket.categoryId,
          nik: ticket.nik,
          holder_email: input.contactEmail,
        })),
        contact_email: input.contactEmail,
        terms_version: input.termsVersion,
      };
      // 409: NIK sudah dipakai di event ini atau stok berubah. 400: isian ditolak validasi server.
      return httpClient.post("/bookings", body, createdBookingSchema, {
        headers: grantHeaders(credentialStore),
        errorCodes: { 400: "BOOKING_INVALID", 401: "ACCESS_EXPIRED", 409: "BOOKING_REJECTED" },
      });
    },
  };
}
