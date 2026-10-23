import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { z } from "zod";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { failureOf, setupApiServer } from "../../__tests__/support";
import { apiFetch, noContent } from "../client";

const server = setupApiServer();
const URL_PATH = "/client-test";
const body = z.object({ ok: z.boolean() });
const respond = (response: () => Response) => server.use(http.get(`${MOCK_API_BASE_URL}${URL_PATH}`, response));

describe("apiFetch", () => {
  it("response valid diparse schema", async () => {
    respond(() => HttpResponse.json({ ok: true }));
    expect(await apiFetch(URL_PATH, body)).toEqual({ ok: true });
  });

  it("response dengan bentuk salah menjadi invalid_response", async () => {
    respond(() => HttpResponse.json({ ok: "ya" }));
    expect(await failureOf(apiFetch(URL_PATH, body))).toEqual({ kind: "invalid_response" });
  });

  it.each([
    ["QUEUE_TOKEN_INVALID", 401],
    ["ACCESS_EXPIRED", 410],
    ["SESSION_REVOKED", 401],
  ])("memetakan error code %s", async (code, status) => {
    respond(() => HttpResponse.json({ code }, { status }));
    expect(await failureOf(apiFetch(URL_PATH, body))).toEqual({ kind: "api", code, status });
  });

  it("Retry-After (detik) menjadi retryAfterMs", async () => {
    respond(() => HttpResponse.json({ code: "RATE_LIMITED" }, { status: 429, headers: { "retry-after": "12" } }));
    expect(await failureOf(apiFetch(URL_PATH, body))).toEqual({ kind: "api", code: "RATE_LIMITED", status: 429, retryAfterMs: 12_000 });
  });

  it("error tanpa code dikenal menjadi unknown", async () => {
    respond(() => HttpResponse.text("boom", { status: 503 }));
    expect(await failureOf(apiFetch(URL_PATH, body))).toEqual({ kind: "unknown", status: 503 });
  });

  it("gagal jaringan menjadi network", async () => {
    respond(() => HttpResponse.error());
    expect(await failureOf(apiFetch(URL_PATH, body))).toEqual({ kind: "network" });
  });

  it("204 tanpa isi diterima schema noContent", async () => {
    respond(() => new HttpResponse(null, { status: 204 }));
    expect(await apiFetch(URL_PATH, noContent)).toBeUndefined();
  });
});
