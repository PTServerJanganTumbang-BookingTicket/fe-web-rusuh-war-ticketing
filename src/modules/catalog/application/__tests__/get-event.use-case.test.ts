import { describe, expect, it, vi } from "vitest";
import { AppFailure } from "@/core/domain/app-error";
import type { EventDetail } from "../../domain/event.model";
import { createGetEventUseCase } from "../get-event.use-case";

const detail: EventDetail = {
  id: "evt-1",
  name: "Konser A",
  date: "2026-12-25",
  venue: "GBK, Jakarta",
  category: "LIVE MUSIC",
  imageUrl: "https://example.com/event.jpg",
  status: "AVAILABLE",
  queueState: "OPEN",
  display: { enabled: true, action: "queue", labelKey: "home.event.cta.queue" },
  ticketCategories: [{ id: "cat_vip", name: "VIP", price: 1_500_000, available: 10, status: "AVAILABLE" }],
};

describe("createGetEventUseCase", () => {
  it("meneruskan id ke service apa pun yang memenuhi EventProtocol dan mengembalikan detailnya", async () => {
    const getEvent = vi.fn(async () => detail);
    const getEventUseCase = createGetEventUseCase({ eventService: { getEvents: async () => [], getEvent } });
    expect(await getEventUseCase("evt-1")).toEqual(detail);
    expect(getEvent).toHaveBeenCalledWith("evt-1");
  });

  it("galat dari service tidak ditelan", async () => {
    const failure = new AppFailure({ kind: "unknown", status: 404 });
    const getEventUseCase = createGetEventUseCase({
      eventService: { getEvents: async () => [], getEvent: () => Promise.reject(failure) },
    });
    await expect(getEventUseCase("evt-x")).rejects.toBe(failure);
  });
});
