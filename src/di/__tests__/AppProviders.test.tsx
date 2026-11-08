// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { useDependencies } from "@/core/controllers/dependencies.context";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { AppProviders } from "../AppProviders";

const startWorker = vi.fn<(scenario: string | null) => Promise<void>>();
vi.mock("@/mocks/browser", () => ({ startWorker: (scenario: string | null) => startWorker(scenario) }));

function Probe() {
  const { appConfig } = useDependencies<CoreDependencies>();
  return <p>mocking: {String(appConfig.mocking)}</p>;
}

afterEach(() => {
  vi.unstubAllEnvs();
  startWorker.mockReset();
  onlineManager.setOnline(true);
  window.history.replaceState(null, "", "/");
});

describe("AppProviders", () => {
  it("menyediakan dependensi dari container ke anak tanpa menyalakan worker mock", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "");
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
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    await waitFor(() => expect(startWorker).toHaveBeenCalledWith(null));
    await waitFor(() => expect(onlineManager.isOnline()).toBe(true));
  });
});
