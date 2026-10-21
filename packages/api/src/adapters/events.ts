import { z } from "zod";
import type { Event } from "@rusuh/core";
import { apiFetch } from "../http/client";

const eventsResponse = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      venue: z.string(),
      startsAt: z.string(),
      status: z.enum(["upcoming", "on_sale", "sold_out"]),
      minPriceIdr: z.number(),
    }),
  ),
});

export async function listEvents(): Promise<Event[]> {
  const { events } = await apiFetch("/events", eventsResponse);
  return events;
}
