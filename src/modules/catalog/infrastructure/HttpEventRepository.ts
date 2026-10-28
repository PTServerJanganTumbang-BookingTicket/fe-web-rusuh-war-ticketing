import { z } from "zod";
import type { HttpClient } from "@/platform/http/HttpClient";
import type { EventRepository } from "../application/EventRepository";
import type { Event } from "../domain/event";

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

export class HttpEventRepository implements EventRepository {
  private readonly httpClient: HttpClient;

  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }

  async list(): Promise<Event[]> {
    const { events } = await this.httpClient.get("/events", eventsResponse);
    return events;
  }
}
