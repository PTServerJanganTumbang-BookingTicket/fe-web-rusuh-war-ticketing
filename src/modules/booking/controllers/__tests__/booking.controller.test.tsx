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
import type { BookingViewProps } from "../../views/BookingView";

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
  const add = (view: () => BookingViewProps, id: string) =>
    act(() =>
      view()
        .categories.items.find((category) => category.id === id)
        ?.onAdd(),
    );

  it("menampilkan Detail Tiket: tiga kategori, event, dan tombol lanjut mati tanpa tiket", async () => {
    const { view } = await readyView();
    expect(view().header.heading).toBe("Pilih tempatmu di konser.");
    expect(view().categories.items.map((category) => category.name)).toEqual(["VIP", "Festival", "Tribune"]);
    await waitFor(() => expect(view().event?.imageUrl).toBe("/images/concert-placeholder.webp"));
    expect(view().holders).toBeUndefined();
    expect(view().submit.disabled).toBe(true);
  });

  it("menambah tiket membuat slot NIK per tiket dan berhenti di 3", async () => {
    const { view } = await readyView();
    add(view, "cat_vip");
    add(view, "cat_vip");
    add(view, "cat_festival");
    await waitFor(() => expect(view().holders?.items).toHaveLength(3));
    expect(view().summary.footnote).toBe("3 tiket · Maksimal 3 tiket per pesanan");
    expect(view().categories.items.every((category) => !category.canAdd)).toBe(true);
  });

  it("tiket habis tidak bisa ditambah", async () => {
    const { view } = await readyView();
    add(view, "cat_tribune");
    expect(view().summary.lines).toEqual([]);
  });

  it("NIK dicek ke Dukcapil saat field ditinggalkan", async () => {
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().holders?.items[0]?.nik.onChange("3171-0000-0000-1234"));
    expect(view().holders?.items[0]?.nik.value).toBe("3171000000001234");
    act(() => view().holders?.items[0]?.nik.onBlur?.());
    await waitFor(() =>
      expect(view().holders?.items[0]?.nik.success).toBe("Terverifikasi atas nama WARGA 1234"),
    );

    act(() => view().holders?.items[0]?.nik.onChange("3171000000000099"));
    act(() => view().holders?.items[0]?.nik.onBlur?.());
    await waitFor(() => expect(view().holders?.items[0]?.nik.error).toBe("NIK tidak aktif di Dukcapil."));
  });

  it("submit tanpa data lengkap menampilkan galat, tanpa request", async () => {
    push.mockClear();
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().submit.onSubmit());
    expect(view().buyer.name.error).toBe("Isi nama lengkap pemesan.");
    expect(view().holders?.items[0]?.nik.error).toBe("NIK harus 16 digit angka.");
    expect(push).not.toHaveBeenCalled();
  });

  it("submit lengkap membuat booking dan lanjut ke pembayaran", async () => {
    push.mockClear();
    const { view } = await readyView();
    add(view, "cat_vip");
    add(view, "cat_festival");
    act(() => view().buyer.name.onChange("Rina"));
    act(() => view().buyer.email.onChange("rina@example.com"));
    act(() => view().holders?.items[0]?.nik.onChange("3171000000001234"));
    act(() => view().holders?.items[1]?.nik.onChange("3171000000005678"));
    act(() => view().submit.onSubmit());
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/orders\/RB-\d+\/pay$/)));
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
