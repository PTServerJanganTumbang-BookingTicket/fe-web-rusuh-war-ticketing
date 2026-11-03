// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import {
  admitToQueue,
  createWrapper,
  OPEN_EVENT_ID,
  setupMockServer,
  setupTestContainer,
  testConfig,
} from "@/test/support";
import { useBookingController } from "../booking.controller";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const server = setupMockServer();

/** Detail Ticket hanya bisa dibuka dengan grant dari antrian (X-Grant-Token). */
async function readyView() {
  const container = setupTestContainer();
  await admitToQueue(container);
  const hook = renderHook(() => useBookingController(OPEN_EVENT_ID), { wrapper: createWrapper(container) });
  await waitFor(() => expect(hook.result.current.kind).toBe("ready"));
  const view = () => {
    const screen = hook.result.current;
    if (screen.kind !== "ready") throw new Error("belum siap");
    return screen.view;
  };
  return { ...hook, view };
}

describe("useBookingController", () => {
  it("menampilkan sesi booking: NIK diisi per tiket, tiga kategori, sisa kuota 3/3", async () => {
    const { view } = await readyView();
    expect(view().eventName).toBe("Konser A");
    expect(view().nik.maskedValue).toBe("Diisi per tiket");
    expect(view().nik.hint).toContain("sisa 3/3");
    expect(view().categories.map((c) => c.name)).toEqual(["VIP", "Festival", "Tribune"]);
    expect(view().submit.disabled).toBe(true);
  });

  it("menambah tiket mengubah total dan kuota, dan berhenti di 3", async () => {
    const { result, view } = await readyView();
    const add = (id: string) =>
      act(
        () =>
          result.current.kind === "ready" &&
          view()
            .categories.find((c) => c.id === id)
            ?.onAdd(),
      );

    add("cat_vip");
    add("cat_vip");
    add("cat_festival");
    await waitFor(() => expect(view().total.label).toBe("Total (3 tiket)"));
    expect(view().nik.hint).toContain("sisa 0/3");
    expect(view().categories.every((c) => !c.canAdd)).toBe(true);
    expect(view().submit.disabled).toBe(false);
  });

  it("tiket habis tidak bisa ditambah", async () => {
    const { result, view } = await readyView();
    act(() =>
      view()
        .categories.find((c) => c.id === "cat_tribune")
        ?.onAdd(),
    );
    expect(result.current.kind === "ready" && view().total.label).toBe("Total (0 tiket)");
  });

  it("grant ditolak (401): kembali ke Waiting Room (mode default)", async () => {
    replace.mockClear();
    const { result } = renderHook(() => useBookingController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/queue`));
    expect(result.current.kind).toBe("status");
  });

  it("mode screen: layar sesi berakhir dengan tombol antre lagi, tanpa redirect otomatis", async () => {
    replace.mockClear();
    push.mockClear();
    const container = setupTestContainer({}, { ...testConfig, bookingExpiry: "screen" });
    const { result } = renderHook(() => useBookingController(OPEN_EVENT_ID), {
      wrapper: createWrapper(container),
    });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.action).toBeTruthy());
    act(() => result.current.kind === "status" && result.current.view.action?.onClick());
    expect(push).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/queue`);
    expect(replace).not.toHaveBeenCalled();
  });

  it("jaringan gagal tanpa data: layar status error", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/tickets`, () => HttpResponse.error()));
    const { result } = renderHook(() => useBookingController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.tone).toBe("error"));
  });
});
