import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { failureOf, setupApiServer } from "../../__tests__/support";
import { getBookingSession } from "../booking";

const server = setupApiServer();

describe("getBookingSession", () => {
  it("mem-parse sesi booking dengan kuota dan kategori", async () => {
    const session = await getBookingSession("evt-1");
    expect(session.quota).toEqual({ max: 3, used: 0, remaining: 3 });
    expect(session.categories.map((c) => c.id)).toEqual(["vip", "festival", "tribune"]);
    expect(session.maskedNik).toContain("•");
  });

  it("memetakan ACCESS_EXPIRED dari server", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/booking-session`, () => HttpResponse.json({ code: "ACCESS_EXPIRED" }, { status: 410 })),
    );
    expect(await failureOf(getBookingSession("evt-1"))).toEqual({ kind: "api", code: "ACCESS_EXPIRED", status: 410 });
  });
});
