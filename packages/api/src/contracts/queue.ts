import { z } from "zod";

// KONTRAK-ASUMSI: GET /events/{eventId}/queue
export const queueResponse = z.discriminatedUnion("status", [
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

export type QueueResponseDto = z.output<typeof queueResponse>;
