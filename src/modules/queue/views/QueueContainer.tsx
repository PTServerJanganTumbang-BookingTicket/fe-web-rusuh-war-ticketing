"use client";

import { useQueueController } from "../controllers/queue.controller";
import { QueueView } from "./QueueView";

export function QueueContainer({ eventId }: { eventId: string }) {
  const vm = useQueueController(eventId);
  return <QueueView {...vm} />;
}
