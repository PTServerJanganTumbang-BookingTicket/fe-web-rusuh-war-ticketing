import { describe, expect, it } from "vitest";
import type { QueueProtocol } from "../../domain/queue.protocol";
import type { QueueState } from "../../domain/queue-state.model";
import { createJoinQueueUseCase } from "../join-queue.use-case";

describe("createJoinQueueUseCase", () => {
  it("meneruskan eventId ke QueueProtocol.join dan mengembalikan state-nya", async () => {
    const state: QueueState = {
      status: "waiting",
      eventName: "Konser A",
      fullBooked: false,
      stale: false,
      position: 10,
      joinedPosition: 10,
      ratePerMin: 0,
      retryAfterMs: 5000,
    };
    const asked: string[] = [];
    const unused = async (): Promise<never> => {
      throw new Error("tidak dipakai");
    };
    const queueService: QueueProtocol = {
      join: async (eventId) => {
        asked.push(eventId);
        return state;
      },
      getOwnState: unused,
      getState: unused,
      getEvent: unused,
      leave: () => undefined,
    };
    expect(await createJoinQueueUseCase({ queueService })("evt-1")).toBe(state);
    expect(asked).toEqual(["evt-1"]);
  });
});
