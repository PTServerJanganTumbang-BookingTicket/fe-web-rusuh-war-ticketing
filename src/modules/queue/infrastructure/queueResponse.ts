import { z } from "zod";
import type { QueueState } from "../domain/queueState";

/** Bentuk state antrian, sama untuk GET snapshot dan event SSE `queue`. */
export const queueResponse = z
  .discriminatedUnion("status", [
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
  ])
  .transform((response): QueueState => {
    if (response.status === "admitted") return response;
    return {
      status: "waiting",
      eventName: response.eventName,
      position: response.position,
      joinedPosition: response.joinedPosition,
      etaSeconds: response.etaSeconds,
      retryAfterMs: response.retryAfterSeconds * 1000,
    };
  });
