import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AppConfig } from "@/core/domain/app-config.model";
import { createFetchHttpClient } from "../fetch-http.client";

const config = (apiCredentials: AppConfig["apiCredentials"]): AppConfig => ({
  apiBaseUrl: "https://api.test",
  appBaseUrl: "",
  apiCredentials,
  mocking: false,
  bookingExpiry: "queue",
  secureCookies: false,
});

function setup(apiCredentials: AppConfig["apiCredentials"]) {
  const fetchFn = vi.fn(async () =>
    Response.json({ meta: { code: 200, message: "Success" }, data: { ok: true } }),
  );
  const client = createFetchHttpClient({ appConfig: config(apiCredentials), fetchFn });
  return { client, fetchFn };
}

describe("createFetchHttpClient credentials", () => {
  it("bawaan: cookie host API ikut (kontrak, cookie queue_token)", async () => {
    const { client, fetchFn } = setup("include");
    await client.get("/events", z.unknown());
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.test/events",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("omit: tanpa cookie di semua metode, supaya backend ber-CORS wildcard tidak ditolak peramban", async () => {
    const { client, fetchFn } = setup("omit");
    await client.get("/a", z.unknown());
    await client.post("/b", {}, z.unknown());
    await client.patch("/c", {}, z.unknown());
    await client.delete("/d");
    expect(fetchFn).toHaveBeenCalledTimes(4);
    for (const [, init] of fetchFn.mock.calls as unknown as [string, RequestInit][]) {
      expect(init.credentials).toBe("omit");
    }
  });
});
