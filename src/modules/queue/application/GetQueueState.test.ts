import { describe, expect, it } from "vitest";
import type { QueueState } from "../domain/queueState";
import { GetQueueState } from "./GetQueueState";

describe("GetQueueState", () => {
  it("meneruskan eventId ke repository", async () => {
    const state: QueueState = {
      status: "admitted",
      eventName: "Konser A",
      accessToken: "tok",
      expiresAt: "x",
    };
    const asked: string[] = [];
    const getQueueState = new GetQueueState({
      queueRepository: {
        getState: async (eventId) => {
          asked.push(eventId);
          return state;
        },
      },
    });
    expect(await getQueueState.execute("evt-1")).toBe(state);
    expect(asked).toEqual(["evt-1"]);
  });
});
