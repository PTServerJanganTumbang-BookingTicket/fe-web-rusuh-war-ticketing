// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { asValue } from "awilix";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { setupFakeEventSources } from "@/test/fake-event-source";
import { createWrapper, setupMockServer, setupTestContainer, TEST_APP_ORIGIN } from "@/test/support";
import { useQueueController } from "./queue.controller";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const server = setupMockServer();

describe("useQueueController", () => {
  it("memuat lalu menampilkan posisi, estimasi, dan progress", async () => {
    const { result } = renderHook(() => useQueueController("evt-q1"), { wrapper: createWrapper() });
    expect(result.current.state).toBe("loading");

    await waitFor(() => expect(result.current.state).toBe("waiting"));
    expect(result.current.position?.value).toBe("#1.248");
    expect(result.current.eta?.value).toBe("± 4 menit");
    expect(result.current.progress?.percent).toBe(0);
  });

  it("saat giliran tiba menyimpan sesi satu kali lalu pindah ke Detail Ticket", async () => {
    const started = vi.fn();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue`, () =>
        HttpResponse.json({
          status: "admitted",
          eventName: "Konser A",
          accessToken: "tok-1",
          expiresAt: "2026-10-19T10:10:00.000Z",
        }),
      ),
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, async ({ request }) => {
        started(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(() => useQueueController("evt-q2"), { wrapper: createWrapper() });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/events/evt-q2/book"));
    expect(started).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledWith({ accessToken: "tok-1" });
    expect(result.current.state).toBe("admitted");
  });

  it("gagal menyimpan sesi: tampil pesan dan tombol coba lagi, tanpa pindah halaman", async () => {
    push.mockClear();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue`, () =>
        HttpResponse.json({
          status: "admitted",
          eventName: "Konser A",
          accessToken: "tok-2",
          expiresAt: "2026-10-19T10:10:00.000Z",
        }),
      ),
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useQueueController("evt-q3"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.action?.label).toBe("Coba lagi"));
    expect(push).not.toHaveBeenCalled();
  });

  it("jaringan gagal: state error dengan pesan jaringan, bukan pesan mentah", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/queue`, () => HttpResponse.error()));
    const { result } = renderHook(() => useQueueController("evt-q4"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.message).toBe("Koneksi bermasalah. Kami mencoba lagi otomatis.");
  });

  it("SSE: posisi dari stream menggantikan snapshot, dan admitted dari stream menutup stream lalu masuk", async () => {
    push.mockClear();
    const fakes = setupFakeEventSources();
    const container = setupTestContainer({ eventSourceFactory: asValue(fakes.factory) });
    server.use(
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 204 })),
    );
    const { result } = renderHook(() => useQueueController("evt-q5"), { wrapper: createWrapper(container) });
    await waitFor(() => expect(result.current.state).toBe("waiting"));
    const stream = fakes.find("/events/evt-q5/queue/stream")!;

    act(() => {
      stream.emit("open");
      stream.emit("queue", {
        status: "waiting",
        eventName: "Konser A",
        position: 100,
        joinedPosition: 1248,
        etaSeconds: 20,
        retryAfterSeconds: 2,
      });
    });
    expect(result.current.position?.value).toBe("#100");

    act(() =>
      stream.emit("queue", {
        status: "admitted",
        eventName: "Konser A",
        accessToken: "tok-sse",
        expiresAt: "2026-10-19T10:10:00.000Z",
      }),
    );
    expect(stream.closed).toBe(true);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/events/evt-q5/book"));
  });
});
