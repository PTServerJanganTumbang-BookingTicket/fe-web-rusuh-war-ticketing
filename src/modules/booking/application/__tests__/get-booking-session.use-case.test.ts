import { describe, expect, it } from "vitest";
import type { BookingSession } from "../../domain/booking-session.model";
import { createGetBookingSessionUseCase } from "../get-booking-session.use-case";

const session: BookingSession = {
  eventName: "Konser A",
  expiresAt: "2026-10-19T10:05:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
  maskedNik: "3171••••••••0001",
  quota: { max: 3, used: 0, remaining: 3 },
  categories: [],
};

describe("createGetBookingSessionUseCase", () => {
  it("meneruskan eventId ke BookingProtocol", async () => {
    const asked: string[] = [];
    const getBookingSessionUseCase = createGetBookingSessionUseCase({
      bookingService: {
        getSession: async (eventId) => {
          asked.push(eventId);
          return session;
        },
        getEvent: async () => {
          throw new Error("tidak dipakai");
        },
        validateNik: async () => ({ status: "not_found" }),
        submitBooking: async () => ({ bookingId: "RB-1" }),
      },
    });
    expect(await getBookingSessionUseCase("evt-1")).toBe(session);
    expect(asked).toEqual(["evt-1"]);
  });
});
