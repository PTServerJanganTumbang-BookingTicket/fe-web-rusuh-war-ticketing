import { createHandlers, DEFAULT_SCENARIO, isScenario } from "./handlers";

// Disimpan di globalThis agar bertahan saat HMR mengevaluasi ulang modul ini; MSW tidak boleh di-setup dua kali.
const globalForWorker = globalThis as typeof globalThis & { __rusuhMockWorker?: Promise<void> };

// Idempoten juga untuk Strict Mode (effect dua kali di dev). `msw/browser` diimpor dinamis supaya tidak dievaluasi saat SSR.
export function startWorker(scenarioParam?: string | null): Promise<void> {
  globalForWorker.__rusuhMockWorker ??= (async () => {
    const { setupWorker } = await import("msw/browser");
    const scenario = isScenario(scenarioParam) ? scenarioParam : DEFAULT_SCENARIO;
    await setupWorker(...createHandlers(scenario)).start({ onUnhandledFrame: "bypass" });
  })();
  return globalForWorker.__rusuhMockWorker;
}
