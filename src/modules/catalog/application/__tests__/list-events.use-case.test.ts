import { describe, expect, it } from "vitest";
import type { Event } from "../../domain/event.model";
import { createListEventsUseCase } from "../list-events.use-case";

const event: Event = {
  id: "evt-1",
  name: "Konser A",
  date: "2026-12-25T12:00:00.000Z",
  venue: "GBK",
  category: "LIVE MUSIC",
  imageUrl: "https://example.com/event.jpg",
  status: "AVAILABLE",
  queueState: "OPEN",
  display: {
    enabled: true,
    action: "queue",
    labelKey: "catalog.joinQueue",
  },
};

describe("createListEventsUseCase", () => {
  it("mengembalikan event dari service apa pun yang memenuhi EventProtocol", async () => {
    const listEventsUseCase = createListEventsUseCase({
      eventService: {
        getEvents: async () => [event],
        getEvent: async () => event,
      },
    });
    expect(await listEventsUseCase()).toEqual([event]);
  });
});
