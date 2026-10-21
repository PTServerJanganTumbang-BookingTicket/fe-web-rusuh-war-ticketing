"use client";

import { QueueView } from "@rusuh/ui";
import { useQueueViewModel } from "./useQueueViewModel";

export function QueueContainer({ eventId }: { eventId: string }) {
  const vm = useQueueViewModel(eventId);
  return <QueueView {...vm} />;
}
