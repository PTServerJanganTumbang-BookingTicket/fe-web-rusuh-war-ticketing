// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { createWrapper, setupMockServer } from "../../__tests__/support";
import { useQueueViewModel } from "../useQueueViewModel";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const server = setupMockServer();

describe("useQueueViewModel", () => {
  it("memuat lalu menampilkan posisi, estimasi, dan progress", async () => {
    const { result } = renderHook(() => useQueueViewModel("evt-q1"), { wrapper: createWrapper() });
    expect(result.current.state.kind).toBe("loading");

    await waitFor(() => expect(result.current.state.kind).toBe("waiting"));
    const state = result.current.state;
    expect(state.kind === "waiting" && state.queue).toMatchObject({ position: 1248, joinedPosition: 1248, etaSeconds: 240 });
  });

  it("saat giliran tiba menyimpan sesi satu kali lalu pindah ke Detail Ticket", async () => {
    const started = vi.fn();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue`, () =>
        HttpResponse.json({ status: "admitted", eventName: "Konser A", accessToken: "tok-1", expiresAt: "2026-10-19T10:10:00.000Z" }),
      ),
      http.post("http://localhost:3000/api/session/start", async ({ request }) => {
        started(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(() => useQueueViewModel("evt-q2"), { wrapper: createWrapper() });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/events/evt-q2/book"));
    expect(started).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledWith({ accessToken: "tok-1" });
    expect(result.current.state).toEqual({ kind: "entering", eventName: "Konser A" });
  });

  it("gagal menyimpan sesi: tampil pesan dan tombol coba lagi, tanpa pindah halaman", async () => {
    push.mockClear();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue`, () =>
        HttpResponse.json({ status: "admitted", eventName: "Konser A", accessToken: "tok-2", expiresAt: "2026-10-19T10:10:00.000Z" }),
      ),
      http.post("http://localhost:3000/api/session/start", () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useQueueViewModel("evt-q3"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.state.kind).toBe("enterFailed"));
    expect(push).not.toHaveBeenCalled();
  });

  it("jaringan gagal: state failed dengan AppError network", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/queue`, () => HttpResponse.error()));
    const { result } = renderHook(() => useQueueViewModel("evt-q4"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.state).toEqual({ kind: "failed", error: { kind: "network" } }));
  });
});
