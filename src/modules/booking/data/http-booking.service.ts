import { grantHeaders } from "@/core/data/credentials/grant-headers.utils";
import type { HttpClient } from "@/core/data/http/http.client";
import type { AppConfig } from "@/core/domain/app-config.model";
import { AppFailure } from "@/core/domain/app-error";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { BookingEvent } from "../domain/booking-event.model";
import type {
  CreatedBooking,
  NikCheck,
  SubmitBookingInput,
  TicketHolderInput,
} from "../domain/booking-request.model";
import type { BookingProtocol } from "../domain/booking.protocol";
import type { BookingSession } from "../domain/booking-session.model";
import {
  bookingEventSchema,
  bookingSessionSchema,
  createdBookingSchema,
  nikCheckSchema,
  queueGrantSchema,
} from "./booking-session.schema";

/** Tepat satu dari `nik`, `saved_nik_id`, `use_account_nik` per kursi (kontrak §4.3). */
function seatHolder(holder: TicketHolderInput) {
  if (holder.kind === "account") return { use_account_nik: true };
  if (holder.kind === "saved") return { saved_nik_id: holder.savedNikId };
  return { nik: holder.nik };
}

export function createHttpBookingService({
  appConfig,
  httpClient,
  credentialStore,
}: {
  appConfig: AppConfig;
  httpClient: HttpClient;
  credentialStore: CredentialStoreProtocol;
}): BookingProtocol {
  /**
   * Grant event ini dari `GET /queue/me` (kontrak §3.3: grant dikembalikan untuk `GRANTED`, `SELECTING`, dan
   * `AWAITING_PAYMENT`). Dipakai saat penyimpanan tab kosong padahal customer sudah lolos antrian: tab baru, muat
   * ulang, atau grant diterbitkan di tab lain. Header sama dengan service antrian: device id, dan token antrian
   * hanya bila cookie tidak bisa dipakai.
   */
  async function recoverGrant(eventId: string): Promise<string | null> {
    const queueToken = appConfig.apiCredentials === "omit" ? credentialStore.queueToken(eventId) : null;
    const grant = await httpClient.get(`/events/${encodeURIComponent(eventId)}/queue/me`, queueGrantSchema, {
      headers: {
        "x-device-id": credentialStore.deviceId(),
        ...(queueToken ? { "x-queue-token": queueToken } : {}),
      },
      errorCodes: { 401: "ACCESS_EXPIRED" },
    });
    if (grant) credentialStore.saveGrantToken(eventId, grant);
    return grant;
  }

  return {
    async getSession(eventId: string): Promise<BookingSession> {
      // `/tickets` tidak pernah dipanggil tanpa grant milik event ini: jawabannya pasti 401 dan layar menampilkan
      // "kedaluwarsa" padahal grant bisa dipulihkan. Tanpa grant, customer kembali ke antrian.
      const grant = credentialStore.grantToken(eventId) ?? (await recoverGrant(eventId));
      if (!grant) throw new AppFailure({ kind: "api", code: "ACCESS_EXPIRED", status: 401 });
      // 401: grant habis, tidak dikenal, atau bukan milik perangkat ini. Semuanya berarti kembali ke antrian.
      return httpClient.get(`/events/${encodeURIComponent(eventId)}/tickets`, bookingSessionSchema, {
        headers: grantHeaders(credentialStore, eventId),
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
        tickets: input.tickets.map((ticket) => ({
          category_id: ticket.categoryId,
          ...seatHolder(ticket.holder),
        })),
        // Seluruh e-tiket satu booking dikirim ke email ini (kontrak v2.14; `holder_email` per tiket dihapus).
        contact_email: input.contactEmail,
      };
      // 409: NIK sudah dipakai di event ini atau stok berubah. 400: isian ditolak validasi server, termasuk
      // `saved_nik_id` / `use_account_nik` yang tidak berlaku (`VALIDATION_ERROR`, jawabannya sama untuk semua sebab).
      return httpClient.post("/bookings", body, createdBookingSchema, {
        headers: grantHeaders(credentialStore),
        errorCodes: { 400: "BOOKING_INVALID", 401: "ACCESS_EXPIRED", 409: "BOOKING_REJECTED" },
        serverErrorCodes: {
          // 409 punya dua arti: NIK terpakai (BOOKING_REJECTED) dan stok kurang (INSUFFICIENT_STOCK, layar tersendiri).
          INSUFFICIENT_STOCK: "STOCK_INSUFFICIENT",
          // 401 juga punya dua arti: grant habis (ACCESS_EXPIRED) dan sesi akun yang tidak terbukti. Kursi
          // `saved_nik_id` / `use_account_nik` hanya berlaku bagi akun yang terbukti (kontrak §4.3).
          UNAUTHORIZED: "UNAUTHENTICATED",
          TOKEN_EXPIRED: "UNAUTHENTICATED",
          TOKEN_INVALID: "UNAUTHENTICATED",
        },
      });
    },
  };
}
