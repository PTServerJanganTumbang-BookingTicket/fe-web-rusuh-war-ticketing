// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { asValue } from "awilix";
import { AppFailure } from "@/core/domain/app-error";
import { createWrapper, setupTestContainer } from "@/test/support";
import type { Event } from "../../domain/event.model";
import { eventsQueryOptions } from "../catalog.queries";
import { useHomeController } from "../home.controller";

const event = { id: "evt-1", name: "Konser A" } as Event;

const mount = (listEvents: () => Promise<Event[]>) =>
  renderHook(() => useHomeController(), {
    wrapper: createWrapper(setupTestContainer({ listEventsUseCase: asValue(listEvents) } as never)),
  });

describe("useHomeController", () => {
  it("memuat daftar event", async () => {
    const { result } = mount(() => Promise.resolve([event]));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.events).toEqual([]);
    await waitFor(() => expect(result.current.events).toEqual([event]));
    expect(result.current.error).toBeNull();
  });

  it("galat jaringan dipetakan ke AppError", async () => {
    const { result } = mount(() => Promise.reject(new AppFailure({ kind: "network" })));
    await waitFor(() => expect(result.current.error).toEqual({ kind: "network" }));
    expect(result.current.events).toEqual([]);
  });
});

describe("eventsQueryOptions", () => {
  it("polling sekitar 5 detik dengan jitter dari random", () => {
    const listEventsUseCase = vi.fn(() => Promise.resolve([event]));
    const options = eventsQueryOptions({ listEventsUseCase, random: { next: () => 0 } });
    expect(options.queryKey).toEqual(["catalog", "events"]);
    const poll = options.refetchInterval as (query: { state: { status: string } }) => number | false;
    const interval = poll({ state: { status: "success" } }) as number;
    expect(interval).toBeGreaterThanOrEqual(4000);
    expect(interval).toBeLessThanOrEqual(6000);
  });

  it("berhenti polling setelah query berstatus error (retry habis)", () => {
    const options = eventsQueryOptions({ listEventsUseCase: vi.fn(), random: { next: () => 0 } });
    const poll = options.refetchInterval as (query: { state: { status: string } }) => number | false;
    expect(poll({ state: { status: "error" } })).toBe(false);
  });
});
