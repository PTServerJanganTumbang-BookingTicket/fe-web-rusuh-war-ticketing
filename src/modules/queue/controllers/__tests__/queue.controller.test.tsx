// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { asValue } from "awilix";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { setupFakeEventSources } from "@/test/fake-event-source";
import {
  createWrapper,
  OPEN_EVENT_ID,
  setupMockServer,
  setupTestContainer,
  TEST_APP_ORIGIN,
} from "@/test/support";
import { useQueueController } from "../queue.controller";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const server = setupMockServer();

const grantedMe = (grantToken: string) =>
  http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
    HttpResponse.json({
      meta: { code: 200, message: "Success" },
      data: {
        state: "GRANTED",
        grant_token: grantToken,
        booking_expires_at: "2026-10-19T10:10:00.000Z",
        server_time: "2026-10-19T10:05:00.000Z",
      },
    }),
  );

describe("useQueueController", () => {
  it("join lalu menampilkan posisi, estimasi, dan progress dari /queue/me", async () => {
    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    expect(result.current.state).toBe("loading");

    // Join di posisi 1.248; poll /queue/me pertama memajukan antrian 416 langkah.
    await waitFor(() => expect(result.current.state).toBe("waiting"));
    expect(result.current.eventName).toBe("Konser A");
    expect(result.current.position?.value).toBe("#832");
    expect(result.current.eta?.value).toBe("± 3 menit");
    expect(result.current.progress?.percent).toBe(33);
  });

  it("saat giliran tiba menyimpan grant satu kali lalu pindah ke Detail Ticket", async () => {
    push.mockClear();
    const started = vi.fn();
    server.use(
      grantedMe("gt_1"),
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, async ({ request }) => {
        started(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const container = setupTestContainer();

    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), {
      wrapper: createWrapper(container),
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/book`));
    expect(started).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledWith({ accessToken: "gt_1" });
    expect(container.cradle.credentialStore.grantToken()).toBe("gt_1");
    expect(result.current.state).toBe("admitted");
  });

  it("gagal menyimpan sesi: tampil pesan dan tombol coba lagi, tanpa pindah halaman", async () => {
    push.mockClear();
    server.use(
      grantedMe("gt_2"),
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.action?.label).toBe("Coba lagi"));
    expect(push).not.toHaveBeenCalled();
  });

  it("jaringan gagal: state error dengan pesan jaringan, bukan pesan mentah", async () => {
    server.use(http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () => HttpResponse.error()));
    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.message).toBe("Koneksi bermasalah. Kami mencoba lagi otomatis.");
  });

  it("antrian penuh (503) memakai pesan QUEUE_FULL", async () => {
    const { result } = renderHook(() => useQueueController("evt_konser_b"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.message).toBe("Antrian sedang penuh. Coba lagi beberapa saat lagi.");
  });

  it("grant kedaluwarsa: antrian berakhir dengan pesan, tanpa pindah halaman", async () => {
    push.mockClear();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
        HttpResponse.json({ meta: { code: 200, message: "Success" }, data: { state: "EXPIRED" } }),
      ),
    );
    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.message).toBe("Waktu pemilihan tiketmu sudah habis. Masuk antrian lagi dari awal.");
    expect(push).not.toHaveBeenCalled();
  });

  it("SSE: now_serving dari stream menggantikan snapshot, lalu `grant` mengambil token dari /queue/me", async () => {
    push.mockClear();
    const fakes = setupFakeEventSources();
    const container = setupTestContainer({ eventSourceFactory: asValue(fakes.factory) });
    server.use(
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 204 })),
    );
    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), {
      wrapper: createWrapper(container),
    });
    await waitFor(() => expect(result.current.state).toBe("waiting"));
    const stream = fakes.find(`/events/${OPEN_EVENT_ID}/queue/stream`)!;

    // Tiket customer 32.748; now_serving 32.648 berarti posisi 100.
    act(() => {
      stream.emit("open");
      stream.emit("message", { nowServing: 32_648, state: "OPEN", ratePerMin: 318, paused: false });
    });
    expect(result.current.position?.value).toBe("#100");

    server.use(grantedMe("gt_sse"));
    act(() => stream.emit("grant", {}));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/book`));
    expect(stream.closed).toBe(true);
  });
});
