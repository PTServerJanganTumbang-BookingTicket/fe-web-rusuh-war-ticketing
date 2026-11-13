import { pollingStopped } from "@/core/controllers/query-retry.utils";
import { queryOptions } from "@tanstack/react-query";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { GetBookingEventUseCase } from "../application/get-booking-event.use-case";
import type { GetBookingSessionUseCase } from "../application/get-booking-session.use-case";
import type { ListHolderAliasesUseCase } from "../application/list-holder-aliases.use-case";
import { STOCK_REFRESH_INTERVAL_MS, STOCK_STALE_TIME_MS } from "../domain/booking.constants";

function isAllSoldOut(session: { categories: readonly { stock: number }[] } | undefined): boolean {
  return Boolean(session) && session!.categories.length > 0 && session!.categories.every((c) => c.stock <= 0);
}

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
  // Jitter diundi sekali per opsi, bukan per pemanggilan `refetchInterval`: nilai yang berubah tiap render (hitung
  // mundur merender ulang tiap detik) membuat TanStack Query memasang ulang timer sehingga polling tidak pernah jalan.
  // Pemanggil memoisasi opsi ini (`useMemo`) supaya nilainya tetap selama layar terpasang.
  const intervalMs = withJitter(STOCK_REFRESH_INTERVAL_MS, deps.random.next());
  return queryOptions({
    queryKey: bookingKeys.session(eventId),
    queryFn: () => deps.getBookingSessionUseCase(eventId),
    // Berhenti saat error, saat semua kategori habis (layar kembali ke Beranda), dan selama tab tersembunyi.
    refetchInterval: (query) =>
      pollingStopped(query) || isAllSoldOut(query.state.data) ? false : intervalMs,
    refetchIntervalInBackground: false,
    // Kembali ke tab menyegarkan stok yang sudah lewat staleTime tanpa menunggu tik polling.
    refetchOnWindowFocus: true,
    staleTime: STOCK_STALE_TIME_MS,
  });
}

/**
 * Alias akun untuk pemegang tiket. Tamu mendapat 401 dan tetap mengisi NIK manual, jadi tidak diulang.
 * Tidak ada polling: alias diubah di halaman profil, bukan selama memilih tiket.
 */
export function holderAliasesQuery(
  deps: { listHolderAliasesUseCase: ListHolderAliasesUseCase },
  signedIn = true,
) {
  return queryOptions({
    queryKey: bookingKeys.aliases,
    queryFn: () => deps.listHolderAliasesUseCase(),
    // Tamu tidak punya Daftar NIK: tidak diminta, dan data cache lama tidak dipakai.
    enabled: signedIn,
    retry: false,
    staleTime: Infinity,
  });
}
