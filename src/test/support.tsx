import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { asValue, type NameAndRegistrationPair } from "awilix";
import { http } from "msw";
import { createAppContainer, type AppContainer, type AppRegistry } from "@/di/container";
import { server } from "@/mocks/node";
import { createHandlers, MOCK_API_BASE_URL } from "@/mocks/handlers";
import type { AppConfig } from "@/core/domain/app-config.model";
import { DependencyProvider } from "@/core/controllers/dependencies.context";
import { setupFakeEventSources } from "./fake-event-source";

/** Origin palsu untuk route handler same-origin (`/api/session/start`) di Node. */
export const TEST_APP_ORIGIN = "http://localhost:3000";

export const testConfig: AppConfig = {
  apiBaseUrl: MOCK_API_BASE_URL,
  appBaseUrl: TEST_APP_ORIGIN,
  apiCredentials: "include",
  // Kontrol simulasi pembayaran hanya ada di mode mock; test controller berjalan di mode itu.
  mocking: true,
  bookingExpiry: "queue",
  secureCookies: false,
};

/**
 * Route same-origin `/api/auth/*` dan `/api/account/*` dijalankan lewat gateway asli dengan cookie jar seperti
 * browser, jadi test controller melewati lapisan yang sama dengan produksi (ADR-0023).
 */
function sameOriginAccountHandlers() {
  const { accountGateway } = createAppContainer(testConfig).cradle;
  const jar = new Map<string, string>();
  const withCookies = async (
    request: Request,
    handle: (request: Request) => Response | Promise<Response>,
  ) => {
    const headers = new Headers(request.headers);
    headers.set("cookie", [...jar].map(([name, value]) => `${name}=${value}`).join("; "));
    const body = request.method === "GET" || request.method === "DELETE" ? undefined : await request.text();
    const response = await handle(new Request(request.url, { method: request.method, headers, body }));
    for (const cookie of response.headers.getSetCookie()) {
      const [pair = "", ...attributes] = cookie.split("; ");
      const [name = "", ...value] = pair.split("=");
      if (attributes.includes("Max-Age=0")) jar.delete(name);
      else jar.set(name, value.join("="));
    }
    return response;
  };
  const api = `${TEST_APP_ORIGIN}/api`;
  return [
    ...["magic-link", "magic-link/resend", "register"].map((path) =>
      http.post(`${api}/auth/${path}`, ({ request }) =>
        withCookies(request, (forwarded) => accountGateway.forwardAuth(forwarded, path)),
      ),
    ),
    http.post(`${api}/auth/verify`, ({ request }) => withCookies(request, accountGateway.verify)),
    http.post(`${api}/auth/verify-email`, ({ request }) => withCookies(request, accountGateway.verifyEmail)),
    http.get(`${api}/auth/session`, ({ request }) => withCookies(request, accountGateway.session)),
    http.post(`${api}/auth/logout`, ({ request }) => withCookies(request, () => accountGateway.logout())),
    http.all(`${api}/account/*`, ({ request }) =>
      withCookies(request, (forwarded) =>
        accountGateway.forward(forwarded, new URL(forwarded.url).pathname.replace("/api/account/", "")),
      ),
    ),
  ];
}

/** Handler dasar satu test: mock kontrak BE dengan state baru, plus route same-origin dengan cookie jar baru. */
const freshHandlers = () => [...sameOriginAccountHandlers(), ...createHandlers()];

/**
 * Server MSW bersama: skenario dasar dari `src/mocks`, override per test lewat `server.use`.
 * Handler dibuat ulang tiap test supaya state mock (antrian, booking, stok, sesi akun) tidak bocor antar test.
 */
export function setupMockServer() {
  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
    server.resetHandlers(...freshHandlers());
  });
  afterEach(() => server.resetHandlers(...freshHandlers()));
  afterAll(() => server.close());
  return server;
}

/**
 * Container yang sama dengan produksi (service HTTP asli terhadap MSW). `overrides` mengganti registrasi
 * tertentu dengan fake, misalnya `clock`, tanpa memock modul. EventSource default diganti fake yang tidak
 * pernah tersambung, jadi controller memakai polling cadangan kecuali test mengirim event sendiri.
 */
export function setupTestContainer(
  overrides: NameAndRegistrationPair<Partial<AppRegistry>> = {},
  config: AppConfig = testConfig,
): AppContainer {
  const container = createAppContainer(config);
  container.register({ eventSourceFactory: asValue(setupFakeEventSources().factory), ...overrides });
  return container;
}

export function createWrapper(container: AppContainer = setupTestContainer()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DependencyProvider dependencies={container.cradle}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </DependencyProvider>
    );
  };
}

/** Event mock yang antriannya terbuka (src/mocks/api/fixtures.ts). */
export const OPEN_EVENT_ID = "evt_konser_a";

/**
 * Masuk antrian dan menunggu giliran lewat service asli, lalu menyimpan grant seperti Waiting Room.
 * Skenario `queue-moving` memberi grant pada poll ketiga.
 */
export async function admitToQueue(container: AppContainer, eventId = OPEN_EVENT_ID): Promise<string> {
  const { queueService, credentialStore } = container.cradle;
  for (let poll = 0; poll < 5; poll += 1) {
    const state = await queueService.getOwnState(eventId);
    if (state.status === "admitted") {
      credentialStore.saveGrantToken(state.accessToken);
      return state.accessToken;
    }
  }
  throw new Error("grant tidak diberikan mock");
}
