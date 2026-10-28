import type { Observer, Unsubscribe } from "@/core/application/LiveUpdates";
import type { EventStreamClient } from "@/platform/sse/EventStreamClient";
import type { QueueUpdates } from "../application/QueueUpdates";
import type { QueueState } from "../domain/queueState";
import { queueResponse } from "./queueResponse";

/** `GET /events/{id}/queue/stream`, event `queue`. Server mengirim snapshot saat tersambung (ADR-0016). */
export class SseQueueUpdates implements QueueUpdates {
  private readonly eventStreamClient: EventStreamClient;

  constructor({ eventStreamClient }: { eventStreamClient: EventStreamClient }) {
    this.eventStreamClient = eventStreamClient;
  }

  watch(eventId: string, observer: Observer<QueueState>): Unsubscribe {
    return this.eventStreamClient.open(
      `/events/${encodeURIComponent(eventId)}/queue/stream`,
      "queue",
      queueResponse,
      observer,
    );
  }
}
