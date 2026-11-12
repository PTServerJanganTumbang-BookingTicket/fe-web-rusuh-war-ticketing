import { describe, expect, it } from "vitest";
import type { QueueProtocol } from "../../domain/queue.protocol";
import type { QueueState } from "../../domain/queue-state.model";
import { createGetQueueEventUseCase } from "../get-queue-event.use-case";
import { createGetQueueStateUseCase } from "../get-queue-state.use-case";

/** Fake protocol: method yang tidak dipakai test gagal supaya pemanggilan salah ketahuan. */
function fakeQueue(overrides: Partial<QueueProtocol>): QueueProtocol {
  const unused = async (): Promise<never> => {
    throw new Error("tidak dipakai");
  };
  return {
    join: unused,
    getOwnState: unused,
    getState: unused,
    getEvent: unused,
    leave: () => undefined,
    ...overrides,
  };
}

describe("createGetQueueStateUseCase", () => {
  it("meneruskan eventId ke QueueProtocol.getState (polling cadangan)", async () => {
    const state: QueueState = {
      status: "admitted",
      eventName: "Konser A",
      accessToken: "tok",
      expiresAt: "x",
    };
    const asked: string[] = [];
    const getQueueStateUseCase = createGetQueueStateUseCase({
      queueService: fakeQueue({
        getState: async (eventId) => {
          asked.push(eventId);
          return state;
        },
      }),
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
      queueService: fakeQueue({
        getEvent: async (eventId) => ({ ...event, name: `${event.name} ${eventId}` }),
      }),
    });
    expect((await getQueueEventUseCase("evt-1")).name).toBe("Konser A evt-1");
  });
});
