import { grantHeaders } from "@/core/data/credentials/grant-headers.utils";
import type { HttpClient } from "@/core/data/http/http.client";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { BookingProtocol } from "../domain/booking.protocol";
import type { BookingSession } from "../domain/booking-session.model";
import { bookingSessionSchema } from "./booking-session.schema";

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
  };
}
