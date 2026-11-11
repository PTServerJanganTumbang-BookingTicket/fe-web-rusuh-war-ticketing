import { pollingStopped } from "@/core/controllers/query-retry.utils";
import { queryOptions } from "@tanstack/react-query";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { GetBookingEventUseCase } from "../application/get-booking-event.use-case";
import type { GetBookingSessionUseCase } from "../application/get-booking-session.use-case";
import type { ListHolderAliasesUseCase } from "../application/list-holder-aliases.use-case";
import { STOCK_REFRESH_INTERVAL_MS } from "../domain/booking.constants";

export const bookingKeys = {
  session: (eventId: string) => ["booking", "session", eventId] as const,
  event: (eventId: string) => ["booking", "event", eventId] as const,
  aliases: ["booking", "aliases"] as const,
};

/** Detail event jarang berubah selama memilih tiket; dimuat sekali tanpa polling. */
export function bookingEventQuery(deps: { getBookingEventUseCase: GetBookingEventUseCase }, eventId: string) {
  return queryOptions({
    queryKey: bookingKeys.event(eventId),
    queryFn: () => deps.getBookingEventUseCase(eventId),
    staleTime: Infinity,
  });
}

/** Stok disegarkan berkala dengan jitter (ADR-0004). Saat TTL habis server menjawab ACCESS_EXPIRED. */
export function bookingSessionQuery(
  deps: { getBookingSessionUseCase: GetBookingSessionUseCase; random: RandomProtocol },
  eventId: string,
) {
  return queryOptions({
    queryKey: bookingKeys.session(eventId),
    queryFn: () => deps.getBookingSessionUseCase(eventId),
    refetchInterval: (query) =>
      pollingStopped(query) ? false : withJitter(STOCK_REFRESH_INTERVAL_MS, deps.random.next()),
  });
}

/**
 * Alias akun untuk pemegang tiket. Tamu mendapat 401 dan tetap mengisi NIK manual, jadi tidak diulang.
 * Tidak ada polling: alias diubah di halaman profil, bukan selama memilih tiket.
 */
export function holderAliasesQuery(deps: { listHolderAliasesUseCase: ListHolderAliasesUseCase }) {
  return queryOptions({
    queryKey: bookingKeys.aliases,
    queryFn: () => deps.listHolderAliasesUseCase(),
    retry: false,
    staleTime: Infinity,
  });
}
