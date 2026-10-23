import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { failureOf, setupApiServer } from "../../__tests__/support";
import { startSession } from "../session";

const server = setupApiServer();
const ROUTE = "http://localhost:3000/api/session/start";

describe("startSession", () => {
  it("menitipkan access token ke route handler same-origin", async () => {
    const body = vi.fn();
    server.use(
      http.post(ROUTE, async ({ request }) => {
        body(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await startSession("tok-1");
    expect(body).toHaveBeenCalledWith({ accessToken: "tok-1" });
  });

  it("route gagal menjadi unknown dengan status", async () => {
    server.use(http.post(ROUTE, () => new HttpResponse(null, { status: 500 })));
    expect(await failureOf(startSession("tok-2"))).toEqual({ kind: "unknown", status: 500 });
  });

  it("gagal jaringan menjadi network", async () => {
    server.use(http.post(ROUTE, () => HttpResponse.error()));
    expect(await failureOf(startSession("tok-3"))).toEqual({ kind: "network" });
  });
});
