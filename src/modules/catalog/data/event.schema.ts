import { z } from "zod";
import type { Event, EventStatus, QueueState, DisplayBlock } from "../domain/event.model";

/** Schema untuk DisplayBlock dari server */
const displayBlockSchema = z.object({
  enabled: z.boolean(),
  action: z.enum(["queue", "book", "disabled"]),
  labelKey: z.string(),
  badgeKey: z.string().optional(),
}) satisfies z.ZodType<DisplayBlock>;

/** Schema untuk satu Event sesuai API v2.1 dan event.model.ts */
export const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  venue: z.string(),
  imageUrl: z.string(),
  status: z.enum(["AVAILABLE", "SELLING_OUT_FAST", "SOLD_OUT"]) as z.ZodType<EventStatus>,
  queueState: z.enum(["NOT_OPEN", "DIRECT", "OPEN", "FULL"]) as z.ZodType<QueueState>,
  display: displayBlockSchema,
}) satisfies z.ZodType<Event>;

/** Response `GET /events` — daftar semua event. */
export const eventListSchema = z.object({ events: z.array(eventSchema) });

/** Response `GET /events/{id}` — detail satu event. */
export const eventDetailSchema = eventSchema;
