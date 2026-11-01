import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { asValue, type NameAndRegistrationPair } from "awilix";
import { createAppContainer, type AppContainer, type AppRegistry } from "@/di/container";
import { server } from "@/mocks/node";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import type { AppConfig } from "@/core/domain/app-config.model";
import { DependencyProvider } from "@/core/controllers/dependencies.context";
import { setupFakeEventSources } from "./fake-event-source";

/** Origin palsu untuk route handler same-origin (`/api/session/start`) di Node. */
export const TEST_APP_ORIGIN = "http://localhost:3000";

export const testConfig: AppConfig = {
  apiBaseUrl: MOCK_API_BASE_URL,
  appBaseUrl: TEST_APP_ORIGIN,
  // Kontrol simulasi pembayaran hanya ada di mode mock; test controller berjalan di mode itu.
  mocking: true,
  bookingExpiry: "queue",
};

/** Server MSW bersama: skenario dasar dari `src/mocks`, override per test lewat `server.use`. */
export function setupMockServer() {
  beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
  afterEach(() => server.resetHandlers());
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
