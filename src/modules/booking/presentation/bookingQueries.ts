import { queryOptions } from "@tanstack/react-query";
import type { RandomSource } from "@/core/application/RandomSource";
import { withJitter } from "@/core/domain/time/jitter";
import type { GetBookingSession } from "../application/GetBookingSession";

export const bookingKeys = {
  session: (eventId: string) => ["booking", "session", eventId] as const,
};

const STOCK_REFRESH_MS = 15_000;

/** Stok disegarkan berkala dengan jitter (ADR-0004). Saat TTL habis server menjawab ACCESS_EXPIRED. */
export function bookingSessionQuery(
  deps: { getBookingSession: GetBookingSession; random: RandomSource },
  eventId: string,
) {
  return queryOptions({
    queryKey: bookingKeys.session(eventId),
    queryFn: () => deps.getBookingSession.execute(eventId),
    refetchInterval: () => withJitter(STOCK_REFRESH_MS, deps.random.next()),
  });
}
