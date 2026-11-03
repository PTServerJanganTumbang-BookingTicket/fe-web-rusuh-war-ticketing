import type { QueueTicket } from "./queue-state.schema";

/**
 * Tiket antrian hasil join, per event. Dipakai bersama service HTTP dan SSE karena posisi dari stream dihitung
 * dari `ticket_no` milik customer. Hilang saat halaman dimuat ulang; join ulang dengan cookie yang sama
 * mengembalikan tiket yang sama (re-entrancy).
 */
export type QueueTicketCache = {
  get(eventId: string): QueueTicket | undefined;
  set(eventId: string, ticket: QueueTicket): void;
};

export function createMemoryQueueTicketService(): QueueTicketCache {
  const tickets = new Map<string, QueueTicket>();
  return {
    get: (eventId) => tickets.get(eventId),
    set: (eventId, ticket) => void tickets.set(eventId, ticket),
  };
}
