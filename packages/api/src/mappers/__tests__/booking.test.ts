import { describe, expect, it } from "vitest";
import { bookingSessionResponse } from "../../contracts/booking";
import { toBookingSession } from "../booking";

describe("toBookingSession", () => {
  it("memetakan sesi booking dengan kuota dan kategori", () => {
    const dto = bookingSessionResponse.parse({
      eventName: "Konser A",
      expiresAt: "2026-10-19T10:05:00.000Z",
      serverNow: "2026-10-19T10:00:00.000Z",
      maskedNik: "3171••••••••0001",
      quota: { max: 3, used: 1, remaining: 2 },
      categories: [{ id: "vip", name: "VIP", priceIdr: 1_500_000, stock: 12 }],
    });
    expect(toBookingSession(dto)).toEqual({
      eventName: "Konser A",
      expiresAt: "2026-10-19T10:05:00.000Z",
      serverNow: "2026-10-19T10:00:00.000Z",
      maskedNik: "3171••••••••0001",
      quota: { max: 3, used: 1, remaining: 2 },
      categories: [{ id: "vip", name: "VIP", priceIdr: 1_500_000, stock: 12 }],
    });
  });
});
