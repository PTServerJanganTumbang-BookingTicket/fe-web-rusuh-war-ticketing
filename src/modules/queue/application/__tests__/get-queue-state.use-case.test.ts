import { describe, expect, it } from "vitest";
import type { QueueState } from "../../domain/queue-state.model";
import { createGetQueueEventUseCase } from "../get-queue-event.use-case";
import { createGetQueueStateUseCase } from "../get-queue-state.use-case";

describe("createGetQueueStateUseCase", () => {
  it("meneruskan eventId ke QueueProtocol", async () => {
    const state: QueueState = {
      status: "admitted",
      eventName: "Konser A",
      accessToken: "tok",
      expiresAt: "x",
    };
    const asked: string[] = [];
    const getQueueStateUseCase = createGetQueueStateUseCase({
      queueService: {
        getState: async (eventId) => {
          asked.push(eventId);
          return state;
        },
        getEvent: async () => {
          throw new Error("tidak dipakai");
        },
        leave: () => undefined,
      },
    });
    expect(await getQueueStateUseCase("evt-1")).toBe(state);
    expect(asked).toEqual(["evt-1"]);
  });
});

describe("createGetQueueEventUseCase", () => {
  it("meneruskan eventId ke QueueProtocol.getEvent", async () => {
    const event = {
      name: "Konser A",
      category: "LIVE MUSIC",
      city: "Jakarta",
      venue: "GBK",
      date: "2026-12-25",
      imageUrl: "/a.jpg",
    };
    const getQueueEventUseCase = createGetQueueEventUseCase({
      queueService: {
        getState: async () => {
          throw new Error("tidak dipakai");
        },
        getEvent: async (eventId) => ({ ...event, name: `${event.name} ${eventId}` }),
        leave: () => undefined,
      },
    });
    expect((await getQueueEventUseCase("evt-1")).name).toBe("Konser A evt-1");
  });
});
