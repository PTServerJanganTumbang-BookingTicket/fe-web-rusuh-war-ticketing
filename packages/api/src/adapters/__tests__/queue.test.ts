import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { setupApiServer } from "../../__tests__/support";
import { getQueueState } from "../queue";

const server = setupApiServer();

describe("getQueueState", () => {
  it("memetakan waiting dengan retryAfterMs", async () => {
    expect(await getQueueState("evt-1")).toEqual({
      status: "waiting",
      eventName: "Konser A — Jakarta",
      position: 1248,
      joinedPosition: 1248,
      etaSeconds: 240,
      retryAfterMs: 2000,
    });
  });

  it("memetakan admitted pada giliran akhir", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue`, () =>
        HttpResponse.json({ status: "admitted", eventName: "Konser A", accessToken: "tok", expiresAt: "2026-10-19T10:10:00.000Z" }),
      ),
    );
    expect(await getQueueState("evt-1")).toEqual({
      status: "admitted",
      eventName: "Konser A",
      accessToken: "tok",
      expiresAt: "2026-10-19T10:10:00.000Z",
    });
  });
});
