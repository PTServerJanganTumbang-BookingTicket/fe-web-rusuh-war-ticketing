import { describe, expect, it } from "vitest";
import type { QueueState } from "../domain/queue-state.model";
import { GetQueueStateUseCase } from "../get-queue-state.use-case";

describe("GetQueueStateUseCase", () => {
  it("meneruskan eventId ke QueueProtocol", async () => {
    const state: QueueState = {
      status: "admitted",
      eventName: "Konser A",
      accessToken: "tok",
      expiresAt: "x",
    };
    const asked: string[] = [];
    const getQueueStateUseCase = new GetQueueStateUseCase({
      queueService: {
        getState: async (eventId) => {
          asked.push(eventId);
          return state;
        },
      },
    });
    expect(await getQueueStateUseCase.execute("evt-1")).toBe(state);
    expect(asked).toEqual(["evt-1"]);
  });
});
