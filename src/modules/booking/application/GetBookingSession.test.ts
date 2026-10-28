import { describe, expect, it } from "vitest";
import type { BookingSession } from "../domain/bookingSession";
import { GetBookingSession } from "./GetBookingSession";

const session: BookingSession = {
  eventName: "Konser A",
  expiresAt: "2026-10-19T10:05:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
  maskedNik: "3171••••••••0001",
  quota: { max: 3, used: 0, remaining: 3 },
  categories: [],
};

describe("GetBookingSession", () => {
  it("meneruskan eventId ke repository", async () => {
    const asked: string[] = [];
    const getBookingSession = new GetBookingSession({
      bookingRepository: {
        getSession: async (eventId) => {
          asked.push(eventId);
          return session;
        },
      },
    });
    expect(await getBookingSession.execute("evt-1")).toBe(session);
    expect(asked).toEqual(["evt-1"]);
  });
});
