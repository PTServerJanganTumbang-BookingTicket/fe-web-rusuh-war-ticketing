export const queryKeys = {
  events: { list: () => ["events", "list"] as const },
  order: { detail: (orderId: string) => ["order", "detail", orderId] as const },
  booking: { session: (eventId: string) => ["booking", "session", eventId] as const },
  queue: { position: (eventId: string) => ["queue", "position", eventId] as const },
  me: () => ["me"] as const,
};
