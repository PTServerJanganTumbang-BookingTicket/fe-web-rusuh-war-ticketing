import { describe, expect, it } from "vitest";
import type { Event } from "../../domain/event.model";
import { ListEventsUseCase } from "../list-events.use-case";

const event: Event = {
  id: "evt-1",
  name: "Konser A",
  venue: "GBK",
  startsAt: "2026-12-25T12:00:00.000Z",
  status: "on_sale",
  minPriceIdr: 500_000,
};

describe("ListEventsUseCase", () => {
  it("mengembalikan event dari service apa pun yang memenuhi EventProtocol", async () => {
    const listEventsUseCase = new ListEventsUseCase({ eventService: { list: async () => [event] } });
    expect(await listEventsUseCase.execute()).toEqual([event]);
  });
});
