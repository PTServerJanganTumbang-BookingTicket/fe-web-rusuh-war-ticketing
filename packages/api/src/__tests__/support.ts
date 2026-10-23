import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";
import { AppFailure, type AppError } from "@rusuh/core";
import { server } from "@rusuh/mocks/node";

/**
 * Server MSW bersama untuk test `api`: skenario dasar dari `mocks/`, override per test lewat `server.use`.
 * State mock (sesi, order, token) hidup selama satu file test, jadi urutan test di satu file boleh membentuk satu alur.
 */
export function setupApiServer() {
  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
    // fetch ke path relatif (route handler same-origin, mis. /api/session/start) tidak valid di Node; arahkan ke origin dev.
    const mockedFetch = globalThis.fetch;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      typeof input === "string" && input.startsWith("/") ? mockedFetch(new URL(input, "http://localhost:3000"), init) : mockedFetch(input, init),
    );
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => {
    vi.unstubAllGlobals();
    server.close();
  });
  return server;
}

/** AppError dari promise yang gagal; test gagal bila promise berhasil atau melempar selain AppFailure. */
export async function failureOf(promise: Promise<unknown>): Promise<AppError> {
  const thrown: unknown = await promise.catch((error: unknown) => error);
  expect(thrown).toBeInstanceOf(AppFailure);
  return (thrown as AppFailure).error;
}
