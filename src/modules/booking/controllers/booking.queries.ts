import { queryOptions } from "@tanstack/react-query";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { GetBookingSessionUseCase } from "../application/get-booking-session.use-case";
import { STOCK_REFRESH_INTERVAL_MS } from "../domain/booking.constants";

export const bookingKeys = {
  session: (eventId: string) => ["booking", "session", eventId] as const,
};

/** Stok disegarkan berkala dengan jitter (ADR-0004). Saat TTL habis server menjawab ACCESS_EXPIRED. */
export function bookingSessionQuery(
  deps: { getBookingSessionUseCase: GetBookingSessionUseCase; random: RandomProtocol },
  eventId: string,
) {
  return queryOptions({
    queryKey: bookingKeys.session(eventId),
    queryFn: () => deps.getBookingSessionUseCase(eventId),
    refetchInterval: () => withJitter(STOCK_REFRESH_INTERVAL_MS, deps.random.next()),
  });
}
