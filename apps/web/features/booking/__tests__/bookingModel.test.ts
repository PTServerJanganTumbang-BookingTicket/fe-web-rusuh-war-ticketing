import { describe, expect, it } from "vitest";
import type { BookingSession } from "@rusuh/core";
import { deriveBookingScreenState, type BookingScreenInput } from "../bookingModel";

const session: BookingSession = {
  eventName: "Konser A",
  expiresAt: "2026-10-19T10:05:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
  maskedNik: "3171••••••••0001",
  quota: { max: 3, used: 0, remaining: 3 },
  categories: [],
};

const expired = { kind: "api", code: "ACCESS_EXPIRED", status: 410 } as const;
const input = (overrides: Partial<BookingScreenInput>): BookingScreenInput => ({
  session: undefined,
  error: undefined,
  selection: {},
  remainingMs: null,
  expiryMode: "queue",
  ...overrides,
});

describe("deriveBookingScreenState", () => {
  it("belum ada sesi: loading; sesi ada tetapi timer belum siap: loading", () => {
    expect(deriveBookingScreenState(input({}))).toEqual({ kind: "loading" });
    expect(deriveBookingScreenState(input({ session }))).toEqual({ kind: "loading" });
  });

  it("sesi dan timer siap: selecting", () => {
    expect(deriveBookingScreenState(input({ session, remainingMs: 1000, selection: { vip: 1 } }))).toEqual({
      kind: "selecting",
      session,
      selection: { vip: 1 },
      remainingMs: 1000,
    });
  });

  it("ACCESS_EXPIRED dari server: expired sesuai mode, walau data lama masih ada", () => {
    expect(deriveBookingScreenState(input({ error: expired }))).toEqual({ kind: "expired", next: "redirect" });
    expect(deriveBookingScreenState(input({ session, remainingMs: 0, error: expired, expiryMode: "screen" }))).toEqual({
      kind: "expired",
      next: "screen",
    });
  });

  it("timer nol tanpa jawaban server tetap selecting (ADR-0005)", () => {
    expect(deriveBookingScreenState(input({ session, remainingMs: 0 })).kind).toBe("selecting");
  });

  it("error lain: failed bila belum ada data, selecting bila data lama ada", () => {
    expect(deriveBookingScreenState(input({ error: { kind: "network" } }))).toEqual({ kind: "failed", error: { kind: "network" } });
    expect(deriveBookingScreenState(input({ session, remainingMs: 1000, error: { kind: "network" } })).kind).toBe("selecting");
  });
});
