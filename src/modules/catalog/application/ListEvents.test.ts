import { describe, expect, it } from "vitest";
import type { Event } from "../domain/event";
import { ListEvents } from "./ListEvents";

const event: Event = {
  id: "evt-1",
  name: "Konser A",
  venue: "GBK",
  startsAt: "2026-12-25T12:00:00.000Z",
  status: "on_sale",
  minPriceIdr: 500_000,
};

describe("ListEvents", () => {
  it("mengembalikan event dari repository apa pun yang memenuhi port", async () => {
    const listEvents = new ListEvents({ eventRepository: { list: async () => [event] } });
    expect(await listEvents.execute()).toEqual([event]);
  });
});
