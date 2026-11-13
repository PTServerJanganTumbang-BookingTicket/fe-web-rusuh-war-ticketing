// @vitest-environment jsdom
import { Activity, StrictMode, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { asValue } from "awilix";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { t } from "@/core/i18n/t.utils";
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
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const server = setupMockServer();

const envelope = (data: unknown) => HttpResponse.json({ meta: { code: 200, message: "Success" }, data });

const grantedMe = (grantToken: string) =>
  http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
    envelope({
      state: "GRANTED",
      grant_token: grantToken,
      booking_expires_at: "2026-10-19T10:10:00.000Z",
      server_time: "2026-10-19T10:05:00.000Z",
    }),
  );

/** Join yang langsung diberi giliran (antrian kosong): state diambil dari /queue/me. */
const joinGranted = () =>
  http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () =>
    envelope({ granted: true, grant_token: "gt_x", queue_token: "qt_1" }),
  );

const joinRejected = (status: number, errorCode: string, message: string) =>
  http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () =>
    HttpResponse.json({ meta: { code: status, message, error_code: errorCode }, data: {} }, { status }),
  );

/** Path request antrian yang keluar, tanpa awalan host. */
function recordQueueRequests() {
  const paths: string[] = [];
  server.events.on("request:start", ({ request }) => {
    const { pathname } = new URL(request.url);
    const at = pathname.indexOf("/queue/");
    if (at >= 0) paths.push(pathname.slice(at));
  });
  return paths;
}

// Grant tersimpan per tab (sessionStorage): jangan bocor ke test berikutnya.
afterEach(() => window.sessionStorage.clear());

describe("useQueueController", () => {
  it("join lalu menampilkan posisi dari now_serving join, tanpa memanggil /queue/serving atau /queue/me", async () => {
    const paths = recordQueueRequests();
    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    expect(result.current.status.state).toBe("loading");

    // Join di posisi 1.248; laju belum diketahui sampai stream atau polling cadangan memberinya.
    await waitFor(() => expect(result.current.status.state).toBe("waiting"));
    server.events.removeAllListeners();
    expect(result.current.subtitle).toBe("Kamu sudah masuk antrean resmi Konser A.");
    await waitFor(() => expect(result.current.event?.name).toBe("Konser A — Jakarta"));
    expect(result.current.status.position?.value).toBe("#1.248");
    expect(result.current.status.eta?.value).toBe("Menghitung estimasi antrean…");
    expect(result.current.status.progress?.percent).toBe(0);
    expect(paths).toEqual(["/queue/join"]);
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

  it("join langsung diberi giliran: simpan grant satu kali lalu replace ke booking (Back tidak kembali ke antrian)", async () => {
    push.mockClear();
    replace.mockClear();
    const started = vi.fn();
    server.use(
      joinGranted(),
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
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/book`));
    expect(push).not.toHaveBeenCalled();
    expect(started).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledWith({ eventId: OPEN_EVENT_ID, accessToken: "gt_1" });
    expect(container.cradle.credentialStore.grantToken(OPEN_EVENT_ID)).toBe("gt_1");
    expect(result.current.status.state).toBe("admitted");
  });

  it("grant masih dipegang tapi Bayar sudah ditekan (HELD): kembali ke Payment, bukan Detail Ticket", async () => {
    replace.mockClear();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
        envelope({
          state: "HELD",
          grant_token: "gt_h",
          booking_id: "RB-77",
          payment_expires_at: "2026-10-19T10:20:00.000Z",
          server_time: "2026-10-19T10:10:00.000Z",
        }),
      ),
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 204 })),
    );
    const container = setupTestContainer();
    container.cradle.credentialStore.saveGrantToken(OPEN_EVENT_ID, "gt_h");

    renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper(container) });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders/RB-77/pay"));
  });

  it("grant masih dipegang dan masih memilih (SELECTING): tetap ke booking", async () => {
    replace.mockClear();
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
        envelope({ state: "SELECTING", grant_token: "gt_s", booking_id: "RB-78", booking_expires_at: "x" }),
      ),
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 204 })),
    );
    const container = setupTestContainer();
    container.cradle.credentialStore.saveGrantToken(OPEN_EVENT_ID, "gt_s");

    renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper(container) });
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/book`));
  });

  it("gagal menyimpan sesi: tampil pesan dan tombol coba lagi, tanpa pindah halaman", async () => {
    push.mockClear();
    replace.mockClear();
    server.use(
      joinGranted(),
      grantedMe("gt_2"),
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.status.action?.label).toBe("Coba lagi"));
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("jaringan gagal: state error dengan pesan jaringan, bukan pesan mentah", async () => {
    server.use(http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () => HttpResponse.error()));
    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.status.state).toBe("error"));
    expect(result.current.status.message).toBe("Koneksi bermasalah. Kami mencoba lagi otomatis.");
  });

  describe("antrian penuh (QUEUE_FULL)", () => {
    it("pesan di panel status memakai QUEUE_FULL", async () => {
      const { result } = renderHook(() => useQueueController("evt_konser_b"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.status.state).toBe("error"));
      expect(result.current.status.message).toBe("Antrian sedang penuh. Coba lagi beberapa saat lagi.");
    });

    it("modal dengan coba lagi dan kembali ke beranda; tutup modal meninggalkan panel error", async () => {
      const { result } = renderHook(() => useQueueController("evt_konser_b"), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.dialog).toBeDefined());
      expect(result.current.dialog).toMatchObject({
        title: "Antrian sedang penuh",
        primary: { label: "Coba lagi" },
        secondary: { label: "Kembali ke beranda", href: "/" },
      });
      act(() => result.current.dialog?.onDismiss());
      await waitFor(() => expect(result.current.dialog).toBeUndefined());
      expect(result.current.status.state).toBe("error");
    });

    it("coba lagi memanggil join ulang dan masuk antrian bila sudah ada tempat", async () => {
      server.use(joinRejected(503, "QUEUE_FULL", "Antrian sedang penuh"));
      const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.dialog?.title).toBe("Antrian sedang penuh"));

      server.resetHandlers();
      const retry = result.current.dialog?.primary;
      act(() => retry && "onClick" in retry && retry.onClick());
      await waitFor(() => expect(result.current.status.state).toBe("waiting"));
      expect(result.current.dialog).toBeUndefined();
    });
  });

  describe("tiket habis atau penjualan berakhir: modal lalu kembali ke beranda", () => {
    const countdown = "Kamu akan diarahkan ke beranda dalam 10 detik.";

    it.each([
      ["FULL_BOOKED", 409, "Tiket sedang habis"],
      ["SALE_CLOSED", 410, "Tiket sudah habis"],
    ])(
      "join ditolak %s: modal habis dan replace ke beranda setelah 10 detik",
      async (code, status, message) => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
          replace.mockClear();
          server.use(joinRejected(status, code, message));
          const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), {
            wrapper: createWrapper(),
          });
          await waitFor(() => expect(result.current.dialog?.title).toBe("Tiket sudah habis"));
          expect(result.current.dialog).toMatchObject({
            tone: "warning",
            illustration: "box",
            note: countdown,
            primary: { label: "Kembali ke beranda" },
          });
          // Panel status tetap tampil di belakang modal, bukan halaman kosong.
          expect(result.current.status.state).toBe("error");

          await act(async () => {
            await vi.advanceTimersByTimeAsync(3000);
          });
          expect(result.current.dialog?.note).toBe("Kamu akan diarahkan ke beranda dalam 7 detik.");
          expect(replace).not.toHaveBeenCalled();

          await act(async () => {
            await vi.advanceTimersByTimeAsync(7000);
          });
          expect(replace).toHaveBeenCalledWith("/");
        } finally {
          vi.useRealTimers();
        }
      },
    );

    it("tombol Kembali ke beranda langsung replace ke beranda", async () => {
      replace.mockClear();
      server.use(joinRejected(409, "FULL_BOOKED", "Tiket sedang habis"));
      const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.dialog?.title).toBe("Tiket sudah habis"));
      const home = result.current.dialog?.primary;
      act(() => home && "onClick" in home && home.onClick());
      expect(replace).toHaveBeenCalledWith("/");
      expect(push).not.toHaveBeenCalledWith("/");
    });

    it("menutup modal (onDismiss) sama dengan kembali ke beranda", async () => {
      replace.mockClear();
      server.use(joinRejected(410, "SALE_CLOSED", "Tiket sudah habis"));
      const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.dialog).toBeDefined());
      act(() => result.current.dialog?.onDismiss());
      expect(replace).toHaveBeenCalledWith("/");
    });

    it("grant kedaluwarsa: antrian berakhir dengan modal dan pesan, tanpa pindah ke booking", async () => {
      push.mockClear();
      replace.mockClear();
      server.use(
        joinGranted(),
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () => envelope({ state: "EXPIRED" })),
      );
      const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.status.state).toBe("error"));
      expect(result.current.status.message).toBe(
        "Waktu pemilihan tiketmu sudah habis. Masuk antrian lagi dari awal.",
      );
      expect(result.current.dialog).toMatchObject({
        title: "Antrian sudah berakhir",
        description: "Waktu pemilihan tiketmu sudah habis. Masuk antrian lagi dari awal.",
        note: countdown,
      });
      expect(push).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
    });

    it("meninggalkan layar membuang tiket supaya kunjungan berikutnya join bersih", async () => {
      server.use(
        joinGranted(),
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () => envelope({ state: "EXPIRED" })),
      );
      const container = setupTestContainer();
      const { result, unmount } = renderHook(() => useQueueController(OPEN_EVENT_ID), {
        wrapper: createWrapper(container),
      });
      await waitFor(() => expect(result.current.dialog).toBeDefined());
      expect(container.cradle.queueTicketCache.get(OPEN_EVENT_ID)).toBeDefined();
      unmount();
      expect(container.cradle.queueTicketCache.get(OPEN_EVENT_ID)).toBeUndefined();
    });
  });

  describe("pembaruan berhenti (stream tidak tersambung dan /queue/serving gagal)", () => {
    const gone = (path: string) =>
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue/${path}`, () =>
        HttpResponse.json({ meta: { code: 404, message: "Not Found" }, data: {} }, { status: 404 }),
      );
    // /queue/me ikut gagal: tanpa itu polling jatuh ke /queue/me dan tetap berjalan.
    const servingGone = () => [gone("serving"), gone("me")];

    it("menampilkan pemberitahuan dan tombol ambil ulang; berhasil mengambil ulang menghapusnya", async () => {
      server.use(...servingGone());
      const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.status.state).toBe("waiting"));
      expect(result.current.status.refresh).toBeUndefined();

      // Polling cadangan pertama gagal dengan galat kontrak: query berstatus error dan polling berhenti.
      await waitFor(() => expect(result.current.status.refresh).toBeDefined(), { timeout: 9_000 });
      expect(result.current.status.notice).toContain("belum bisa memperbarui");
      expect(result.current.status.updatedNote).toBe("Pembaruan otomatis terhenti");
      expect(result.current.status.position?.value).toBe("#1.248");

      server.resetHandlers();
      act(() => result.current.status.refresh?.onClick());
      await waitFor(() => expect(result.current.status.refresh).toBeUndefined());
      expect(result.current.status.notice).toBeUndefined();
    }, 20_000);

    it("/queue/serving 404 tetapi /queue/me jalan: giliran tiba terdeteksi tanpa refresh halaman", async () => {
      server.use(gone("serving"), grantedMe("gt_poll"));
      const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.status.state).toBe("admitted"), { timeout: 9_000 });
      expect(result.current.status.refresh).toBeUndefined();
    }, 20_000);

    it("stream tersambung: tidak ada pemberitahuan walau polling tidak dipakai", async () => {
      const fakes = setupFakeEventSources();
      const container = setupTestContainer({ eventSourceFactory: asValue(fakes.factory) });
      const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), {
        wrapper: createWrapper(container),
      });
      await waitFor(() => expect(result.current.status.state).toBe("waiting"));
      const stream = fakes.find(`/events/${OPEN_EVENT_ID}/queue/stream`)!;
      act(() => stream.emit("open"));
      expect(result.current.status.refresh).toBeUndefined();
      expect(result.current.status.notice).toBeUndefined();
    });
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
      replace.mockClear();
      const paths = recordQueueRequests();
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
      return { result, stream, first, paths, fakes };
    }

    it("stream baru dibuka setelah join selesai, memakai sse_url dari join", async () => {
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => (release = resolve));
      server.use(
        http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, async () => {
          await gate;
          return envelope({
            ticket_no: 100,
            now_serving: 40,
            position: 60,
            queue_token: "qt_1",
            sse_url: "https://stream.example.test/s/abc",
          });
        }),
      );
      const fakes = setupFakeEventSources();
      const container = setupTestContainer({ eventSourceFactory: asValue(fakes.factory) });
      const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), {
        wrapper: createWrapper(container),
      });

      // Join belum selesai: belum ada stream, layar masih memuat.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(result.current.status.state).toBe("loading");
      expect(fakes.sources).toHaveLength(0);

      release();
      await waitFor(() => expect(result.current.status.state).toBe("waiting"));
      expect(result.current.status.position?.value).toBe("#60");
      expect(fakes.sources.map((source) => source.url)).toEqual(["https://stream.example.test/s/abc"]);
    });

    it("selama stream tersambung tidak ada request ke /queue/serving atau /queue/me sampai nowServing >= ticket_no", async () => {
      const { result, stream, first, paths } = await waitingWithStream();
      // Tiket customer 32.748; nowServing 32.648 berarti posisi 100.
      first(32_648);
      expect(result.current.status.position?.value).toBe("#100");
      act(() => stream.emit("message", tick(32_700)));
      await waitFor(() => expect(result.current.status.position?.value).toBe("#48"));
      expect(paths).toEqual(["/queue/join"]);

      server.use(grantedMe("gt_sse"));
      act(() => stream.emit("message", tick(32_748)));
      await waitFor(() => expect(replace).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/book`));
      expect(paths).toEqual(["/queue/join", "/queue/me"]);
      expect(push).not.toHaveBeenCalled();
      expect(stream.closed).toBe(true);
    });

    it("stream tidak pernah tersambung: polling cadangan memanggil /queue/serving", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        server.use(
          http.get(`${MOCK_API_BASE_URL}/events/:id/queue/serving`, () =>
            envelope({ now_serving: 32_648, rate_per_min: 318, state: "OPEN", poll_after_ms: 1000 }),
          ),
        );
        const paths = recordQueueRequests();
        const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), {
          wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.status.state).toBe("waiting"));
        expect(result.current.status.position?.value).toBe("#1.248");

        // Polling pertama memakai jeda dari join (5 detik ± jitter); sesudahnya poll_after_ms dari server.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(6000);
        });
        server.events.removeAllListeners();
        await waitFor(() => expect(result.current.status.position?.value).toBe("#100"));
        expect(paths).toContain("/queue/serving");
        expect(paths).not.toContain("/queue/me");
        expect(paths.filter((path) => path === "/queue/join")).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
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
      // Reversibel: tetap menunggu, tanpa modal habis.
      expect(result.current.dialog).toBeUndefined();

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

    it("sold-out menutup stream dan menampilkan modal berakhir dengan hitung mundur ke beranda", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result, stream } = await waitingWithStream();
        act(() =>
          stream.emit("sold-out", { state: "CLOSED", message: "Tiket sudah habis", serverTime: "x" }),
        );
        await waitFor(() => expect(result.current.status.state).toBe("error"));
        expect(result.current.status.message).toBe("Penjualan tiket untuk acara ini sudah ditutup.");
        expect(stream.closed).toBe(true);
        expect(result.current.dialog).toMatchObject({
          title: "Penjualan sudah ditutup",
          description: "Penjualan tiket untuk acara ini sudah ditutup.",
          note: "Kamu akan diarahkan ke beranda dalam 10 detik.",
        });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(10_000);
        });
        expect(replace).toHaveBeenCalledWith("/");
      } finally {
        vi.useRealTimers();
      }
    });
  });
  describe("kembali ke Waiting Room setelah lolos antrian (Back/Forward, route disembunyikan lalu tampil)", () => {
    const sessionStarts = () => {
      const bodies: unknown[] = [];
      server.use(
        http.post(`${TEST_APP_ORIGIN}/api/session/start`, async ({ request }) => {
          bodies.push(await request.json());
          return new HttpResponse(null, { status: 204 });
        }),
      );
      return bodies;
    };

    /** Meniru `<Activity>` Next: state dan ref bertahan, efek dibersihkan saat disembunyikan dan dijalankan lagi saat tampil. */
    function setupActivityHook(container = setupTestContainer()) {
      const Providers = createWrapper(container);
      let mode: "visible" | "hidden" = "visible";
      const Wrapper = ({ children }: { children: ReactNode }) => (
        <Providers>
          <Activity mode={mode}>{children}</Activity>
        </Providers>
      );
      const hook = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: Wrapper });
      const setMode = (next: typeof mode) => {
        mode = next;
        hook.rerender();
      };
      return { ...hook, container, hide: () => setMode("hidden"), show: () => setMode("visible") };
    }

    it("layar yang sama tampil lagi saat sudah admitted: diteruskan ke booking lagi, bukan diam di 'giliran tiba'", async () => {
      replace.mockClear();
      const starts = sessionStarts();
      server.use(joinGranted(), grantedMe("gt_1"));
      const { result, hide, show } = setupActivityHook();
      await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
      expect(starts).toEqual([{ eventId: OPEN_EVENT_ID, accessToken: "gt_1" }]);

      hide();
      show();
      await waitFor(() => expect(replace).toHaveBeenCalledTimes(2));
      expect(replace).toHaveBeenLastCalledWith(`/events/${OPEN_EVENT_ID}/book`);
      expect(starts).toHaveLength(2);
      expect(result.current.status.state).toBe("admitted");
    });

    it("grant masih dipegang: Waiting Room dipasang ulang langsung meneruskan ke booking tanpa join (tanpa CAPTCHA)", async () => {
      replace.mockClear();
      sessionStarts();
      const container = setupTestContainer();
      container.cradle.credentialStore.saveGrantToken(OPEN_EVENT_ID, "gt_dipegang");
      const paths = recordQueueRequests();
      renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper(container) });
      await waitFor(() => expect(replace).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/book`));
      server.events.removeAllListeners();
      // Hanya membaca state ke server (tujuan ditentukan server); tidak ada join dan tidak ada CAPTCHA.
      expect(paths).toEqual(["/queue/me"]);
    });

    it("StrictMode memasang efek dua kali: grant disimpan satu kali", async () => {
      replace.mockClear();
      const starts = sessionStarts();
      server.use(joinGranted(), grantedMe("gt_1"));
      const Providers = createWrapper();
      renderHook(() => useQueueController(OPEN_EVENT_ID), {
        wrapper: ({ children }) => (
          <StrictMode>
            <Providers>{children}</Providers>
          </StrictMode>
        ),
      });
      await waitFor(() => expect(replace).toHaveBeenCalled());
      expect(starts).toHaveLength(1);
    });

    it("hasil admitted lama di cache tidak diikuti: kunjungan berikutnya mengikuti jawaban server sekarang", async () => {
      replace.mockClear();
      sessionStarts();
      server.use(joinGranted(), grantedMe("gt_lama"));
      const container = setupTestContainer();
      const { result, hide, show } = setupActivityHook(container);
      await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));

      // Customer melepas grant (kedaluwarsa di booking), lalu server menjawab keterlibatan lamanya sudah berakhir.
      container.cradle.credentialStore.clearGrantToken();
      server.use(
        http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () =>
          envelope({ rejoined: true, state: "LAPSED", queue_token: "qt_1" }),
        ),
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () => envelope({ state: "LAPSED" })),
      );
      hide();
      show();
      await waitFor(() => expect(result.current.status.state).toBe("error"));
      expect(result.current.status.message).toBe(
        "Waktu pemilihan tiketmu sudah habis. Masuk antrian lagi dari awal.",
      );
      // Tidak ada penerusan kedua dengan grant lama.
      expect(replace).toHaveBeenCalledTimes(1);
    });
  });

  describe("giliran tiba tetapi server masih menjawab QUEUED", () => {
    it("/queue/me ditanya tiap detik walau stream tersambung dan diam, sampai grant terbaca", async () => {
      replace.mockClear();
      let meCalls = 0;
      server.use(
        http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () =>
          envelope({
            ticket_no: 100,
            now_serving: 100,
            position: 0,
            queue_token: "qt_1",
            sse_url: "https://stream.example.test/s/abc",
          }),
        ),
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () => {
          meCalls += 1;
          return meCalls < 3
            ? envelope({ state: "QUEUED", ticket_no: 100, now_serving: 100 })
            : envelope({
                state: "GRANTED",
                grant_token: "gt_late",
                booking_expires_at: "2026-10-19T10:10:00Z",
              });
        }),
        http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 204 })),
      );
      const fakes = setupFakeEventSources();
      const container = setupTestContainer({ eventSourceFactory: asValue(fakes.factory) });
      const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), {
        wrapper: createWrapper(container),
      });
      await waitFor(() => expect(result.current.status.state).toBe("waiting"));
      expect(result.current.status.position?.value).toBe("#0");
      // Stream tersambung tetapi tidak mengirim apa pun.
      act(() => fakes.find("https://stream.example.test/s/abc")?.emit("open"));

      await waitFor(() => expect(replace).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/book`), {
        timeout: 6_000,
      });
      expect(meCalls).toBeGreaterThanOrEqual(3);
    }, 15_000);
  });

  it("state /queue/me yang tidak dikenal menjadi galat dengan pesan, bukan layar menunggu yang diam", async () => {
    server.use(
      joinGranted(),
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () => envelope({ state: "SESUATU_BARU" })),
    );
    const { result } = renderHook(() => useQueueController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.status.state).toBe("error"));
    expect(result.current.status.message).toBe(t("queue.error.unknown"));
  });
});
