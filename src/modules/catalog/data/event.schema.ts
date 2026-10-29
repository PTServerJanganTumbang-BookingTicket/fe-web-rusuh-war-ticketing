import { z } from "zod";
import type { Event } from "../domain/event.model";

export const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  venue: z.string(),
  startsAt: z.string(),
  status: z.enum(["upcoming", "on_sale", "sold_out"]),
  minPriceIdr: z.number(),
}) satisfies z.ZodType<Event>;

/** Response `GET /events`. */
export const eventListSchema = z.object({ events: z.array(eventSchema) });
