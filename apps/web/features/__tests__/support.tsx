import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@rusuh/mocks/node";

/** Server MSW bersama untuk test ViewModel: skenario dasar dari `mocks/`, override per test lewat `server.use`. */
export function setupMockServer() {
  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
    // fetch ke path relatif (route handler same-origin) tidak valid di Node; arahkan ke origin dev.
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

export function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
