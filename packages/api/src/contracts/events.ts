import { z } from "zod";

// Cermin kontrak BE (ADR-0009). Diganti schema hasil generate OpenAPI saat kontrak final (ADR-0017).

// KONTRAK-ASUMSI: GET /events
export const eventDto = z.object({
  id: z.string(),
  name: z.string(),
  venue: z.string(),
  startsAt: z.string(),
  status: z.enum(["upcoming", "on_sale", "sold_out"]),
  minPriceIdr: z.number(),
});

export const eventsResponse = z.object({ events: z.array(eventDto) });

export type EventDto = z.output<typeof eventDto>;
export type EventsResponseDto = z.input<typeof eventsResponse>;
