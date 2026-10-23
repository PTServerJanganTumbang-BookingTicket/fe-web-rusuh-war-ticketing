"use client";

import { QueueView } from "@rusuh/ui";
import { toQueueViewProps } from "./toQueueViewProps";
import { useQueueViewModel } from "./useQueueViewModel";

export function QueueContainer({ eventId }: { eventId: string }) {
  return <QueueView {...toQueueViewProps(useQueueViewModel(eventId))} />;
}
