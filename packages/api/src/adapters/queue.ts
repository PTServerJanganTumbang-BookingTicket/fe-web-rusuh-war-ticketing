import { z } from "zod";
import type { QueueState } from "@rusuh/core";
import { apiFetch } from "../http/client";

const queueResponse = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("waiting"),
    eventName: z.string(),
    position: z.number(),
    joinedPosition: z.number(),
    etaSeconds: z.number(),
    retryAfterSeconds: z.number(),
  }),
  z.object({
    status: z.literal("admitted"),
    eventName: z.string(),
    accessToken: z.string(),
    expiresAt: z.string(),
  }),
]);

export async function getQueueState(eventId: string): Promise<QueueState> {
  const response = await apiFetch(`/events/${encodeURIComponent(eventId)}/queue`, queueResponse);
  if (response.status === "admitted") return response;
  return {
    status: "waiting",
    eventName: response.eventName,
    position: response.position,
    joinedPosition: response.joinedPosition,
    etaSeconds: response.etaSeconds,
    retryAfterMs: response.retryAfterSeconds * 1000,
  };
}
