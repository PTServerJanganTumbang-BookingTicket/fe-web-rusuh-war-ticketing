import type { QueueState } from "@rusuh/core";
import { queueResponse } from "../contracts/queue";
import { apiFetch } from "../http/client";
import { toQueueState } from "../mappers/queue";

export async function getQueueState(eventId: string): Promise<QueueState> {
  return toQueueState(await apiFetch(`/events/${encodeURIComponent(eventId)}/queue`, queueResponse));
}
