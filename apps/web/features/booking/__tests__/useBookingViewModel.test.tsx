// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { createWrapper, setupMockServer } from "../../__tests__/support";
import { useBookingViewModel } from "../useBookingViewModel";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const server = setupMockServer();

async function selecting(eventId: string) {
  const hook = renderHook(() => useBookingViewModel(eventId), { wrapper: createWrapper() });
  await waitFor(() => expect(hook.result.current.state.kind).toBe("selecting"));
  const state = () => {
    const current = hook.result.current.state;
    if (current.kind !== "selecting") throw new Error(`layar: ${current.kind}`);
    return current;
  };
  return { ...hook, state };
}

describe("useBookingViewModel", () => {
  it("memuat sesi booking dari server: NIK tersamar, kuota, tiga kategori, pilihan kosong", async () => {
    const { state } = await selecting("evt-b1");
    expect(state().session.maskedNik).toBe("3171••••••••0001");
    expect(state().session.quota).toEqual({ max: 3, used: 0, remaining: 3 });
    expect(state().session.categories.map((c) => c.name)).toEqual(["VIP", "Festival", "Tribune"]);
    expect(state().selection).toEqual({});
  });

  it("menambah tiket berhenti di 3 per NIK", async () => {
    const { result, state } = await selecting("evt-b2");
    for (const id of ["vip", "vip", "festival", "festival"]) act(() => result.current.actions.add(id));
    await waitFor(() => expect(state().selection).toEqual({ vip: 2, festival: 1 }));
  });

  it("tiket habis tidak bisa ditambah, dan mengurangi tidak turun di bawah 0", async () => {
    const { result, state } = await selecting("evt-b3");
    act(() => result.current.actions.add("tribune"));
    act(() => result.current.actions.remove("vip"));
    expect(state().selection).toEqual({});
  });

  it("server menjawab ACCESS_EXPIRED: kembali ke Waiting Room (mode default)", async () => {
    replace.mockClear();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/booking-session`, () => HttpResponse.json({ code: "ACCESS_EXPIRED" }, { status: 410 })),
    );
    const { result } = renderHook(() => useBookingViewModel("evt-b4"), { wrapper: createWrapper() });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/events/evt-b4/queue"));
    expect(result.current.state).toEqual({ kind: "expired", next: "redirect" });
  });

  it("jaringan gagal tanpa data: failed dengan AppError network", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/booking-session`, () => HttpResponse.error()));
    const { result } = renderHook(() => useBookingViewModel("evt-b5"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.state).toEqual({ kind: "failed", error: { kind: "network" } }));
  });
});
