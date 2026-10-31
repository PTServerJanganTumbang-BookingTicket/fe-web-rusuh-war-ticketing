import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { EventStreamClient } from "@/core/data/sse/event-stream.client";
import type { QueueUpdatesProtocol } from "../domain/queue-updates.protocol";
import type { QueueState } from "../domain/queue-state.model";
import { queueStateSchema } from "./queue-state.schema";

/** `GET /events/{id}/queue/stream`, event `queue`. Server mengirim snapshot saat tersambung (ADR-0016). */
export function createSseQueueUpdatesService({
  eventStreamClient,
}: {
  eventStreamClient: EventStreamClient;
}): QueueUpdatesProtocol {
  return {
    watch(eventId: string, observer: Observer<QueueState>): Unsubscribe {
      return eventStreamClient.open(
        `/events/${encodeURIComponent(eventId)}/queue/stream`,
        "queue",
        queueStateSchema,
        observer,
      );
    },
  };
}
