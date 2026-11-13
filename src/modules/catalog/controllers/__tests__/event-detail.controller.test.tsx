// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { asValue } from "awilix";
import { http, HttpResponse } from "msw";
import { AppFailure } from "@/core/domain/app-error";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer, setupTestContainer } from "@/test/support";
import type { EventDetail } from "../../domain/event.model";
import { useEventDetailController } from "../event-detail.controller";

const server = setupMockServer();

/** Galat sementara diulang sekali dengan jeda bawaan TanStack Query sebelum layar error muncul. */
const RETRY_TIMEOUT = { timeout: 5_000 };

const mount = (eventId: string, container = setupTestContainer()) =>
  renderHook(() => useEventDetailController(eventId), { wrapper: createWrapper(container) });

describe("useEventDetailController (MSW)", () => {
  it("memuat detail event dari API: loading dulu, lalu layar siap dengan kategori tiket", async () => {
    const { result } = mount("evt_konser_a");
    expect(result.current.kind).toBe("loading");
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    if (result.current.kind !== "ready") throw new Error("belum siap");
    const { view } = result.current;
    expect(view.name).toBe("Konser A");
    expect(view.tickets.items.map((item) => item.name)).toContain("VIP");
    expect(view.purchase.cta.href).toBe("/events/evt_konser_a/queue");
  });

  it("event yang tidak ada (404) menjadi layar notFound dengan jalan ke Beranda dan tanpa retry", async () => {
    const { result } = mount("evt_tidak_ada");
    await waitFor(() => expect(result.current.kind).toBe("notFound"));
    if (result.current.kind !== "notFound") throw new Error("bukan notFound");
    expect(result.current.view.title).toBe("Event tidak ditemukan");
    expect(result.current.view.home).toEqual({ label: "Kembali ke Beranda", href: "/" });
    expect(result.current.view.retry).toBeUndefined();
  });

  it("galat server (500) menjadi layar error dengan retry yang memuat ulang", async () => {
    let calls = 0;
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:eventId`, () => {
        calls += 1;
        return HttpResponse.json({ success: false, error: { code: "INTERNAL" } }, { status: 500 });
      }),
    );
    const { result } = mount("evt_konser_a");
    await waitFor(() => expect(result.current.kind).toBe("error"), RETRY_TIMEOUT);
    if (result.current.kind !== "error") throw new Error("bukan error");
    expect(result.current.view.retry?.label).toBe("Coba lagi");
    const before = calls;
    result.current.view.retry?.onClick();
    await waitFor(() => expect(calls).toBeGreaterThan(before));
  });
});

describe("useEventDetailController (use case palsu)", () => {
  const detail = {
    id: "evt-1",
    name: "Konser A",
    date: "2026-12-25",
    venue: "GBK",
    category: "LIVE MUSIC",
    imageUrl: "",
    status: "AVAILABLE",
    queueState: "OPEN",
    display: { enabled: true, action: "queue", labelKey: "home.event.cta.queue" },
    ticketCategories: [],
  } satisfies EventDetail;

  it("jaringan putus tanpa data: layar error", async () => {
    const getEventUseCase = vi.fn(() => Promise.reject(new AppFailure({ kind: "network" })));
    const { result } = mount(
      "evt-1",
      setupTestContainer({ getEventUseCase: asValue(getEventUseCase) } as never),
    );
    await waitFor(() => expect(result.current.kind).toBe("error"), RETRY_TIMEOUT);
  });

  it("memanggil use case dengan id dari URL", async () => {
    const getEventUseCase = vi.fn(() => Promise.resolve(detail));
    const { result } = mount(
      "evt-1",
      setupTestContainer({ getEventUseCase: asValue(getEventUseCase) } as never),
    );
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    expect(getEventUseCase).toHaveBeenCalledWith("evt-1");
  });
});
