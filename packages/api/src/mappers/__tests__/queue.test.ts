import { describe, expect, it } from "vitest";
import { queueResponse } from "../../contracts/queue";
import { toQueueState } from "../queue";

describe("toQueueState", () => {
  it("waiting: retryAfterSeconds menjadi retryAfterMs", () => {
    const dto = queueResponse.parse({ status: "waiting", eventName: "Konser A", position: 10, joinedPosition: 100, etaSeconds: 30, retryAfterSeconds: 2 });
    expect(toQueueState(dto)).toEqual({ status: "waiting", eventName: "Konser A", position: 10, joinedPosition: 100, etaSeconds: 30, retryAfterMs: 2000 });
  });

  it("admitted membawa access token dan batas waktu", () => {
    const dto = queueResponse.parse({ status: "admitted", eventName: "Konser A", accessToken: "tok", expiresAt: "2026-10-19T10:10:00.000Z" });
    expect(toQueueState(dto)).toEqual({ status: "admitted", eventName: "Konser A", accessToken: "tok", expiresAt: "2026-10-19T10:10:00.000Z" });
  });
});
