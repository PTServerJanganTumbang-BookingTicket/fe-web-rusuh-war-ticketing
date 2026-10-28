"use client";

import { useQueueViewModel } from "./useQueueViewModel";
import { QueueView } from "./views/QueueView";

export function QueueContainer({ eventId }: { eventId: string }) {
  const vm = useQueueViewModel(eventId);
  return <QueueView {...vm} />;
}
