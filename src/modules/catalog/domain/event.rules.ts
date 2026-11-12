import type { Event } from "./event.model";

/** Penanda "terbaru": penjualan paling akhir dibuka; tanpa jadwal jual, tanggal pelaksanaan. Kontrak tidak punya `created_at`. */
function recency(event: Pick<Event, "saleStartsAt" | "date">): number {
  const time = Date.parse(event.saleStartsAt ?? event.date);
  return Number.isNaN(time) ? 0 : time;
}

/** Urut dari yang terbaru. Urutan awal dipertahankan untuk event yang sama waktunya. */
export function sortByLatest<T extends Pick<Event, "saleStartsAt" | "date">>(events: readonly T[]): T[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => recency(b.event) - recency(a.event) || a.index - b.index)
    .map(({ event }) => event);
}

/** Event terbaru, maksimal `limit`. */
export function latestEvents<T extends Pick<Event, "saleStartsAt" | "date">>(
  events: readonly T[],
  limit: number,
): T[] {
  return sortByLatest(events).slice(0, limit);
}
