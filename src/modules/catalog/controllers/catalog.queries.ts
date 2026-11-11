import { queryOptions } from "@tanstack/react-query";
import { pollingStopped } from "@/core/controllers/query-retry.utils";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import { withJitter } from "@/core/domain/time/jitter.utils";
import type { ListEventsUseCase } from "../application/list-events.use-case";
import { CATALOG_REFRESH_INTERVAL_MS } from "../domain/catalog.constants";

export const catalogKeys = {
  events: () => ["catalog", "events"] as const,
};

/**
 * Query options untuk daftar event dengan polling 5s.
 * Req 1.4: data harus ter-refresh dalam waktu tidak lebih dari 5 detik.
 * Menggunakan jitter untuk mencegah thundering herd (ADR-0004).
 */
export function eventsQueryOptions(deps: { listEventsUseCase: ListEventsUseCase; random: RandomProtocol }) {
  return queryOptions({
    queryKey: catalogKeys.events(),
    queryFn: () => deps.listEventsUseCase(),
    // Req 1.4: refresh dalam 5 detik; jitter ±20% untuk mencegah sinkronisasi polling
    refetchInterval: (query) =>
      pollingStopped(query) ? false : withJitter(CATALOG_REFRESH_INTERVAL_MS, deps.random.next()),
    // Data stale setelah 1 detik untuk memicu refetch saat focus
    staleTime: 1_000,
  });
}
