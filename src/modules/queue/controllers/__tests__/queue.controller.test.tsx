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
    expect(result.current.status.state).toBe("loading");

    // Join di posisi 1.248; poll /queue/me pertama memajukan antrian 416 langkah.
    await waitFor(() => expect(result.current.status.state).toBe("waiting"));
    expect(result.current.subtitle).toBe("Kamu sudah masuk antrean resmi Konser A.");
    await waitFor(() => expect(result.current.event?.name).toBe("Konser A — Jakarta"));
    expect(result.current.status.position?.value).toBe("#832");
    expect(result.current.status.eta?.value).toBe("± 3 menit");
    expect(result.current.status.progress?.percent).toBe(33);
  });

  it("keluar dari antrian: konfirmasi dulu, batal menutup dialog, ya membuang tiket dan kembali ke Home", async () => {
    push.mockClear();
    const container = setupTestContainer();
    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), {
      wrapper: createWrapper(container),
    });
    await waitFor(() => expect(result.current.status.state).toBe("waiting"));
    expect(result.current.dialog).toBeUndefined();

    act(() => result.current.status.leave?.onClick());
    expect(result.current.dialog).toMatchObject({
      tone: "warning",
      illustration: "confirmation",
      title: "Keluar dari antrian?",
      description:
        "Anda akan keluar dari antrian, anda akan mendapatkan nomor antrian baru jika memutuskan untuk masuk kembali",
      primary: { label: "Ya, keluar" },
      secondary: { label: "Tetap di antrian" },
    });
    // Tetap di antrian: dialog tertutup, tidak ke mana-mana.
    const stay = result.current.dialog?.secondary;
    act(() => stay && "onClick" in stay && stay.onClick());
    expect(result.current.dialog).toBeUndefined();
    expect(push).not.toHaveBeenCalled();

    act(() => result.current.status.leave?.onClick());
    expect(container.cradle.queueTicketCache.get(OPEN_EVENT_ID)).toBeDefined();
    const confirm = result.current.dialog?.primary;
    act(() => confirm && "onClick" in confirm && confirm.onClick());
    expect(container.cradle.queueTicketCache.get(OPEN_EVENT_ID)).toBeUndefined();
    expect(push).toHaveBeenCalledWith("/");
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
    expect(result.current.status.state).toBe("admitted");
  });

  it("gagal menyimpan sesi: tampil pesan dan tombol coba lagi, tanpa pindah halaman", async () => {
    push.mockClear();
    server.use(
      grantedMe("gt_2"),
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.status.action?.label).toBe("Coba lagi"));
    expect(push).not.toHaveBeenCalled();
  });

  it("jaringan gagal: state error dengan pesan jaringan, bukan pesan mentah", async () => {
    server.use(http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () => HttpResponse.error()));
    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.status.state).toBe("error"));
    expect(result.current.status.message).toBe("Koneksi bermasalah. Kami mencoba lagi otomatis.");
  });

  it("antrian penuh (503) memakai pesan QUEUE_FULL", async () => {
    const { result } = renderHook(() => useQueueController("evt_konser_b"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.status.state).toBe("error"));
    expect(result.current.status.message).toBe("Antrian sedang penuh. Coba lagi beberapa saat lagi.");
  });

  it("grant kedaluwarsa: antrian berakhir dengan pesan, tanpa pindah halaman", async () => {
    push.mockClear();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
        HttpResponse.json({ meta: { code: 200, message: "Success" }, data: { state: "EXPIRED" } }),
      ),
    );
    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.status.state).toBe("error"));
    expect(result.current.status.message).toBe(
      "Waktu pemilihan tiketmu sudah habis. Masuk antrian lagi dari awal.",
    );
    expect(push).not.toHaveBeenCalled();
  });

  describe("SSE (kontrak v2.12)", () => {
    const tick = (nowServing: number, state = "OPEN") => ({
      nowServing,
      state,
      ratePerMin: 318,
      serverTime: "2026-10-24T13:10:00.000Z",
    });

    async function waitingWithStream() {
      push.mockClear();
      const fakes = setupFakeEventSources();
      const container = setupTestContainer({ eventSourceFactory: asValue(fakes.factory) });
      server.use(
        http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 204 })),
      );
      const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), {
        wrapper: createWrapper(container),
      });
      await waitFor(() => expect(result.current.status.state).toBe("waiting"));
      const stream = fakes.find(`/events/${OPEN_EVENT_ID}/queue/stream`)!;
      // `open` dan pesan pertama datang bersamaan; memisahkannya memberi polling kesempatan menimpa snapshot.
      const first = (nowServing: number) =>
        act(() => {
          stream.emit("open");
          stream.emit("message", tick(nowServing));
        });
      return { result, stream, first };
    }

    it("nowServing dari stream menggantikan snapshot, lalu nowServing >= ticket_no mengambil token", async () => {
      const { result, stream, first } = await waitingWithStream();
      // Tiket customer 32.748; nowServing 32.648 berarti posisi 100.
      first(32_648);
      expect(result.current.status.position?.value).toBe("#100");

      server.use(grantedMe("gt_sse"));
      act(() => stream.emit("message", tick(32_748)));
      await waitFor(() => expect(push).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/book`));
      expect(stream.closed).toBe(true);
    });

    it("FULL_BOOKED: estimasi disembunyikan dan ada pemberitahuan; OPEN memulihkannya", async () => {
      const { result, stream, first } = await waitingWithStream();
      first(32_648);
      expect(result.current.status.eta).toBeDefined();

      act(() => stream.emit("status", { state: "FULL_BOOKED", fullBookedAt: "x", serverTime: "x" }));
      await waitFor(() => expect(result.current.status.notice).toContain("Tiket sedang habis"));
      expect(result.current.status.eta).toBeUndefined();
      expect(result.current.status.position?.value).toBe("#100");
      expect(stream.closed).toBe(false);

      act(() => stream.emit("status", { state: "OPEN", serverTime: "x" }));
      await waitFor(() => expect(result.current.status.notice).toBeUndefined());
      expect(result.current.status.eta).toBeDefined();
    });

    it("stale: posisi dipertahankan, catatan menjadi Memperbarui, stream tidak ditutup", async () => {
      const { result, stream, first } = await waitingWithStream();
      first(32_648);
      act(() => stream.emit("stale", { stale: true, state: "OPEN", message: "x", serverTime: "x" }));
      await waitFor(() => expect(result.current.status.stale).toBe(true));
      expect(result.current.status.updatedNote).toBe("Memperbarui…");
      expect(result.current.status.position?.value).toBe("#100");
      expect(stream.closed).toBe(false);

      act(() => stream.emit("message", tick(32_650)));
      await waitFor(() => expect(result.current.status.stale).toBe(false));
    });

    it("sold-out menutup stream dan menampilkan antrian berakhir", async () => {
      const { result, stream } = await waitingWithStream();
      act(() => stream.emit("sold-out", { state: "CLOSED", message: "Tiket sudah habis", serverTime: "x" }));
      await waitFor(() => expect(result.current.status.state).toBe("error"));
      expect(result.current.status.message).toBe("Penjualan tiket untuk acara ini sudah ditutup.");
      expect(stream.closed).toBe(true);
    });
  });
});
