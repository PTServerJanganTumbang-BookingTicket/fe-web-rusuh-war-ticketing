import { queryOptions } from "@tanstack/react-query";
import { pollingStopped, shouldRetryQuery } from "@/core/controllers/query-retry.utils";
import { toAppError, type AppError } from "@/core/domain/app-error";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { GetEventUseCase } from "../application/get-event.use-case";
import type { ListEventsUseCase } from "../application/list-events.use-case";
import { CATALOG_REFRESH_INTERVAL_MS, CATALOG_STALE_TIME_MS } from "../domain/catalog.constants";

export const catalogKeys = {
  events: () => ["catalog", "events"] as const,
  event: (eventId: string) => ["catalog", "event", eventId] as const,
};

/**
 * 404 `NOT_FOUND` dari `GET /events/{event_id}`: event tidak ada (kontrak §2.2). Katalog error FE tidak punya
 * kode untuk ini, jadi dikenali dari status HTTP-nya.
 */
export function isEventNotFound(error: AppError): boolean {
  return error.kind === "unknown" && error.status === 404;
}

/**
 * Query options untuk daftar event dengan polling 10s (Req 1.4 dilonggarkan dari 5s).
 * Menggunakan jitter untuk mencegah thundering herd (ADR-0004).
 */
export function eventsQueryOptions(deps: { listEventsUseCase: ListEventsUseCase; random: RandomProtocol }) {
  // Jitter ±20% untuk mencegah sinkronisasi polling, diundi sekali per opsi (pemanggil memoisasi opsi): nilai yang
  // berubah tiap render memasang ulang timer TanStack Query sehingga polling tidak pernah jalan.
  const intervalMs = withJitter(CATALOG_REFRESH_INTERVAL_MS, deps.random.next());
  return queryOptions({
    queryKey: catalogKeys.events(),
    queryFn: () => deps.listEventsUseCase(),
    // Tidak berjalan selama tab tersembunyi.
    refetchInterval: (query) => (pollingStopped(query) ? false : intervalMs),
    refetchIntervalInBackground: false,
    // Kembali ke tab menyegarkan data yang sudah lewat staleTime, jadi tidak perlu menunggu tik polling berikutnya.
    refetchOnWindowFocus: true,
    staleTime: CATALOG_STALE_TIME_MS,
  });
}

/**
 * Detail satu event. Stok per kategori dan status jual disegarkan dengan irama yang sama dengan Home (Req 1.4,
 * jitter ADR-0004); respons ini di-cache CDN, jadi polling tidak sampai ke origin (kontrak §2.2).
 */
export function eventDetailQueryOptions(
  deps: { getEventUseCase: GetEventUseCase; random: RandomProtocol },
  eventId: string,
) {
  const intervalMs = withJitter(CATALOG_REFRESH_INTERVAL_MS, deps.random.next());
  return queryOptions({
    queryKey: catalogKeys.event(eventId),
    queryFn: () => deps.getEventUseCase(eventId),
    refetchInterval: (query) => (pollingStopped(query) ? false : intervalMs),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: CATALOG_STALE_TIME_MS,
    // Event yang tidak ada tidak akan muncul bila diulang; galat sementara mengikuti aturan bersama.
    retry: (failureCount, error) =>
      !isEventNotFound(toAppError(error)) && shouldRetryQuery(failureCount, error),
  });
}
