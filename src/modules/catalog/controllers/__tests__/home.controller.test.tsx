// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { asValue } from "awilix";
import { AppFailure } from "@/core/domain/app-error";
import { createWrapper, setupTestContainer } from "@/test/support";
import type { Event } from "../../domain/event.model";
import { eventsQueryOptions } from "../catalog.queries";
import { useHomeController } from "../home.controller";

const closed = { enabled: false, action: "disabled", labelKey: "home.event.notOpen" } as const;
const open = { enabled: true, action: "queue", labelKey: "home.event.cta.queue" } as const;
const event = { id: "evt-1", name: "Konser A", display: closed } as Event;

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

describe("useHomeController.refetch", () => {
  it("memuat ulang daftar event dengan permintaan baru", async () => {
    const listEvents = vi.fn(() => Promise.resolve([event]));
    const { result } = mount(listEvents);
    await waitFor(() => expect(result.current.events).toEqual([event]));
    expect(listEvents).toHaveBeenCalledTimes(1);

    act(() => result.current.refetch());
    await waitFor(() => expect(listEvents).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isRefetching).toBe(false));
  });

  it("setelah galat, muat ulang yang berhasil menampilkan event dan menghapus galat", async () => {
    const listEvents = vi
      .fn<() => Promise<Event[]>>()
      .mockRejectedValueOnce(new AppFailure({ kind: "network" }))
      .mockResolvedValue([event]);
    const { result } = mount(listEvents);
    await waitFor(() => expect(result.current.error).toEqual({ kind: "network" }));
    expect(result.current.events).toEqual([]);

    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.events).toEqual([event]));
    expect(result.current.error).toBeNull();
    expect(listEvents).toHaveBeenCalledTimes(2);
  });
});

describe("eventsQueryOptions", () => {
  it("polling sekitar 10 detik dengan jitter dari random", () => {
    const listEventsUseCase = vi.fn(() => Promise.resolve([event]));
    const options = eventsQueryOptions({ listEventsUseCase, random: { next: () => 0 } });
    expect(options.queryKey).toEqual(["catalog", "events"]);
    const poll = options.refetchInterval as (query: { state: { status: string } }) => number | false;
    const interval = poll({ state: { status: "success" } }) as number;
    expect(interval).toBeGreaterThanOrEqual(8000);
    expect(interval).toBeLessThanOrEqual(12000);
  });

  it("berhenti polling setelah query berstatus error (retry habis)", () => {
    const options = eventsQueryOptions({ listEventsUseCase: vi.fn(), random: { next: () => 0 } });
    const poll = options.refetchInterval as (query: { state: { status: string } }) => number | false;
    expect(poll({ state: { status: "error" } })).toBe(false);
  });
});

describe("useHomeController: skrip CAPTCHA", () => {
  const mountWithCaptcha = (events: Event[]) => {
    const captcha = { solve: vi.fn(), warm: vi.fn(), presolve: vi.fn() };
    const view = renderHook(() => useHomeController(), {
      wrapper: createWrapper(
        setupTestContainer({
          listEventsUseCase: asValue(() => Promise.resolve(events)),
          captcha: asValue(captcha),
        } as never),
      ),
    });
    return { ...view, captcha };
  };

  it("ada event yang bisa diantri: skrip dimuat lebih awal", async () => {
    const { result, captcha } = mountWithCaptcha([{ ...event, display: open }]);
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(captcha.warm).toHaveBeenCalled();
  });

  it("tidak ada event yang bisa diantri: skrip pihak ketiga tidak dimuat", async () => {
    const { result, captcha } = mountWithCaptcha([event]);
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(captcha.warm).not.toHaveBeenCalled();
  });
});
