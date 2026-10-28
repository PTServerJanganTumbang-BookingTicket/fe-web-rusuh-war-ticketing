// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer, setupTestContainer, testConfig } from "@/test/support";
import { useBookingViewModel } from "../useBookingViewModel";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const server = setupMockServer();

async function readyView(eventId: string) {
  const hook = renderHook(() => useBookingViewModel(eventId), { wrapper: createWrapper() });
  await waitFor(() => expect(hook.result.current.kind).toBe("ready"));
  const view = () => {
    const screen = hook.result.current;
    if (screen.kind !== "ready") throw new Error("belum siap");
    return screen.view;
  };
  return { ...hook, view };
}

describe("useBookingViewModel", () => {
  it("menampilkan sesi booking: NIK tersamar, tiga kategori, sisa kuota 3/3", async () => {
    const { view } = await readyView("evt-b1");
    expect(view().nik.maskedValue).toBe("3171••••••••0001");
    expect(view().nik.hint).toContain("sisa 3/3");
    expect(view().categories.map((c) => c.name)).toEqual(["VIP", "Festival", "Tribune"]);
    expect(view().submit.disabled).toBe(true);
  });

  it("menambah tiket mengubah total dan kuota, dan berhenti di 3", async () => {
    const { result, view } = await readyView("evt-b2");
    const add = (id: string) =>
      act(
        () =>
          result.current.kind === "ready" &&
          view()
            .categories.find((c) => c.id === id)
            ?.onAdd(),
      );

    add("vip");
    add("vip");
    add("festival");
    await waitFor(() => expect(view().total.label).toBe("Total (3 tiket)"));
    expect(view().nik.hint).toContain("sisa 0/3");
    expect(view().categories.every((c) => !c.canAdd)).toBe(true);
    expect(view().submit.disabled).toBe(false);
  });

  it("tiket habis tidak bisa ditambah", async () => {
    const { result, view } = await readyView("evt-b3");
    act(() =>
      view()
        .categories.find((c) => c.id === "tribune")
        ?.onAdd(),
    );
    expect(result.current.kind === "ready" && view().total.label).toBe("Total (0 tiket)");
  });

  it("server menjawab ACCESS_EXPIRED: kembali ke Waiting Room (mode default)", async () => {
    replace.mockClear();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/booking-session`, () =>
        HttpResponse.json({ code: "ACCESS_EXPIRED" }, { status: 410 }),
      ),
    );
    const { result } = renderHook(() => useBookingViewModel("evt-b4"), { wrapper: createWrapper() });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/events/evt-b4/queue"));
    expect(result.current.kind).toBe("status");
  });

  it("mode screen: layar sesi berakhir dengan tombol antre lagi, tanpa redirect otomatis", async () => {
    replace.mockClear();
    push.mockClear();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/booking-session`, () =>
        HttpResponse.json({ code: "ACCESS_EXPIRED" }, { status: 410 }),
      ),
    );
    const container = setupTestContainer({}, { ...testConfig, bookingExpiry: "screen" });
    const { result } = renderHook(() => useBookingViewModel("evt-b6"), { wrapper: createWrapper(container) });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.action).toBeTruthy());
    act(() => result.current.kind === "status" && result.current.view.action?.onClick());
    expect(push).toHaveBeenCalledWith("/events/evt-b6/queue");
    expect(replace).not.toHaveBeenCalled();
  });

  it("jaringan gagal tanpa data: layar status error", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/booking-session`, () => HttpResponse.error()));
    const { result } = renderHook(() => useBookingViewModel("evt-b5"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.tone).toBe("error"));
  });
});
