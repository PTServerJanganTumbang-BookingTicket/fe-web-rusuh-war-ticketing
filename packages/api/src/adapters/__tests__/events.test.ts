import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { failureOf, setupApiServer } from "../../__tests__/support";
import { listEvents } from "../events";

const server = setupApiServer();

describe("listEvents", () => {
  it("mem-parse response valid", async () => {
    const events = await listEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toMatchObject({ id: expect.any(String), status: expect.any(String) });
  });

  it("response dengan bentuk salah menjadi invalid_response", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.json({ events: [{ id: 1 }] })));
    expect(await failureOf(listEvents())).toEqual({ kind: "invalid_response" });
  });
});
