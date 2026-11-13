// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";

const startWorker = vi.fn<(scenario: string | null) => Promise<void>>();
vi.mock("@/mocks/browser", () => ({ startWorker: (scenario: string | null) => startWorker(scenario) }));

/**
 * Modul dimuat ulang tiap test: container dan QueryClient browser dibuat sekali per modul. Context ikut dimuat ulang,
 * jadi `Probe` memakai `useDependencies` dari muatan yang sama.
 */
async function loadAppProviders() {
  vi.resetModules();
  const { AppProviders } = await import("../AppProviders");
  const { useDependencies } = await import("@/core/controllers/dependencies.context");
  function Probe() {
    const { appConfig } = useDependencies<CoreDependencies>();
    return <p>mocking: {String(appConfig.mocking)}</p>;
  }
  return { AppProviders, Probe };
}

afterEach(() => {
  vi.unstubAllEnvs();
  startWorker.mockReset();
  onlineManager.setOnline(true);
  window.history.replaceState(null, "", "/");
});

describe("AppProviders", () => {
  it("menyediakan dependensi dari container ke anak tanpa menyalakan worker mock", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "");
    const { AppProviders, Probe } = await loadAppProviders();
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByText("mocking: false")).toBeTruthy();
    expect(startWorker).not.toHaveBeenCalled();
  });

  it("mode mock: query ditahan sampai worker siap, skenario dibaca dari URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
    window.history.replaceState(null, "", "/?scenario=booking-expiring");
    let finishWorker: () => void = () => undefined;
    startWorker.mockReturnValue(new Promise<void>((resolve) => (finishWorker = resolve)));
    const { AppProviders, Probe } = await loadAppProviders();
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByText("mocking: true")).toBeTruthy();
    await waitFor(() => expect(startWorker).toHaveBeenCalledWith("booking-expiring"));
    expect(onlineManager.isOnline()).toBe(false);
    finishWorker();
    await waitFor(() => expect(onlineManager.isOnline()).toBe(true));
  });

  it("worker gagal start: query tetap dilepas supaya galat tampil", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
    startWorker.mockRejectedValue(new Error("worker gagal"));
    const { AppProviders, Probe } = await loadAppProviders();
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    await waitFor(() => expect(startWorker).toHaveBeenCalledWith(null));
    await waitFor(() => expect(onlineManager.isOnline()).toBe(true));
  });
});
