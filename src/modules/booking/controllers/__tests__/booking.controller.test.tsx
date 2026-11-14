// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Activity, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import {
  admitToQueue,
  createWrapper,
  OPEN_EVENT_ID,
  setupMockServer,
  setupTestContainer,
  TEST_APP_ORIGIN,
  testConfig,
} from "@/test/support";
import { EMAIL_MAX_LENGTH } from "@/core/domain/email.constants";
import { NIK_VERIFY_COOLDOWN_MS } from "../../domain/booking.constants";
import { useBookingController } from "../booking.controller";
import type { BookingViewProps } from "../../views/BookingView";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const server = setupMockServer();

/** Route same-origin yang menghapus cookie grant; dipanggil sebelum customer antre lagi. */
function endSessionRoute() {
  const ended = vi.fn();
  server.use(
    http.post(`${TEST_APP_ORIGIN}/api/session/end`, () => {
      ended();
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return ended;
}

/** Detail Ticket hanya bisa dibuka dengan grant dari antrian (X-Grant-Token). */
async function readyView({ signedIn = false }: { signedIn?: boolean } = {}) {
  const container = setupTestContainer();
  if (signedIn) await container.cradle.verifyLoginUseCase("mt_booking");
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

/** Submit membuka ringkasan pesanan; booking baru dibuat setelah customer memilih lanjut. */
async function submitAndConfirm(view: () => BookingViewProps) {
  act(() => view().submit.onSubmit());
  await waitFor(() => expect(view().dialog?.title).toBe("Periksa pesananmu"));
  const confirm = view().dialog?.primary;
  act(() => confirm && "onClick" in confirm && confirm.onClick());
}

/** Isi NIK satu tiket lalu tekan "Verifikasi Dukcapil"; submit baru terbuka setelah Dukcapil menyatakannya valid. */
async function enterVerifiedNik(view: () => BookingViewProps, index: number, nik: string) {
  act(() => view().holders?.items[index]?.nik.onChange(nik));
  act(() => view().holders?.items[index]?.verify?.onClick());
  await waitFor(() => expect(view().holders?.items[index]?.nik.success).toBe("NIK terverifikasi"));
}

/** Daftar NIK tersimpan sesuai kontrak §1.6: hanya `nik_masked`, tidak pernah NIK lengkap. */
const savedNiksOf = (...maskedNiks: string[]) =>
  http.get(`${MOCK_API_BASE_URL}/accounts/me/saved-niks`, () =>
    HttpResponse.json({
      meta: { code: 200, message: "Success" },
      data: {
        max_entries: 5,
        saved_niks: maskedNiks.map((nikMasked, index) => ({
          id: `snk_${index + 1}`,
          nik_masked: nikMasked,
          label: "Budi",
          verified_at: "2026-10-20T08:11:00Z",
          status: "VERIFIED",
        })),
      },
    }),
  );
const BUDI_MASKED = "3171**********33";

/** Menangkap body `POST /bookings`. */
function captureBooking(captured: { body?: Record<string, unknown> }, bookingId = "RB-CAPTURED") {
  return http.post(`${MOCK_API_BASE_URL}/bookings`, async ({ request }) => {
    captured.body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { meta: { code: 201, message: "Created" }, data: { booking_id: bookingId } },
      { status: 201 },
    );
  });
}

/** Mencatat NIK yang dikirim ke `POST /nik/validate`. */
function captureValidate(niks: string[]) {
  return http.post(`${MOCK_API_BASE_URL}/nik/validate`, async ({ request }) => {
    const { nik } = (await request.json()) as { nik: string };
    niks.push(nik);
    return HttpResponse.json({
      meta: { code: 200, message: "NIK is valid" },
      data: { nik, valid: true, name: "PEMILIK AKUN", status: "ACTIVE" },
    });
  });
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

  it("sesi booking baru (expires_at berganti, mis. antri ulang) membuang pilihan tiket dan isian lama", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { view } = await readyView();
      add(view, "cat_vip");
      act(() => view().buyer.email.onChange("rina@example.com"));
      await waitFor(() => expect(view().holders?.items).toHaveLength(1));

      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/tickets`, () =>
          HttpResponse.json({
            meta: { code: 200, message: "Success" },
            data: {
              event: { name: "Konser A" },
              session: {
                expires_at: new Date(Date.now() + 600_000).toISOString(),
                server_time: new Date().toISOString(),
              },
              categories: [{ id: "cat_vip", name: "VIP", description: "", price: 100_000, available: 5 }],
              rules: { max_tickets_per_order: 3 },
            },
          }),
        ),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(13_000);
      });
      await waitFor(() => expect(view().holders).toBeUndefined());
      expect(view().categories.items.every((category) => category.quantity === 0)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
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

  it("NIK tiket menolak digit setelah ke-16", async () => {
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().holders?.items[0]?.nik.onChange("31710000000012349999"));
    expect(view().holders?.items[0]?.nik.value).toBe("3171000000001234");
  });

  it("meninggalkan field NIK tidak mengecek ke Dukcapil; hanya tombol verifikasi yang mengecek", async () => {
    const validated: string[] = [];
    server.use(captureValidate(validated));
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().buyer.email.onChange("rina@example.com"));
    act(() => view().holders?.items[0]?.nik.onChange("3171-0000-0000-1234"));
    expect(view().holders?.items[0]?.nik.value).toBe("3171000000001234");
    act(() => view().holders?.items[0]?.nik.onBlur?.());
    // Tunggu satu putaran supaya permintaan yang (seharusnya tidak) terkirim sempat tercatat.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(validated).toEqual([]);
    expect(view().holders?.items[0]?.nik.error).toBe("Verifikasi NIK ini ke Dukcapil dulu sebelum lanjut.");
    expect(view().submit.disabled).toBe(true);

    act(() => view().holders?.items[0]?.verify?.onClick());
    await waitFor(() => expect(view().holders?.items[0]?.nik.success).toBe("NIK terverifikasi"));
    expect(validated).toEqual(["3171000000001234"]);
    expect(view().submit.disabled).toBe(false);
  });

  it("NIK tidak cocok di Dukcapil membuka modal Periksa NIK; Ubah data memfokus field tiket itu", async () => {
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().holders?.items[0]?.nik.onChange("3171000000000099"));
    act(() => view().holders?.items[0]?.verify?.onClick());
    await waitFor(() => expect(view().dialog?.title).toBe("Periksa NIK-mu"));
    expect(view().holders?.items[0]?.nik.error).toBe("NIK tidak aktif di Dukcapil.");
    const edit = view().dialog?.primary;
    act(() => edit && "onClick" in edit && edit.onClick());
    expect(view().dialog).toBeUndefined();
    expect(view().holders?.items[0]?.nik).toMatchObject({ value: "3171000000000099", focusKey: 1 });
  });

  it("Dukcapil tidak menjawab: modal verifikasi belum tersedia tanpa menyebut NIK salah, coba lagi mengecek ulang", async () => {
    let attempts = 0;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/nik/validate`, () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.error();
        return HttpResponse.json({
          meta: { code: 200, message: "NIK is valid" },
          data: { nik: "3171000000001234", valid: true, name: "WARGA 1234", status: "ACTIVE" },
        });
      }),
    );
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().holders?.items[0]?.nik.onChange("3171000000001234"));
    act(() => view().holders?.items[0]?.verify?.onClick());
    await waitFor(() => expect(view().dialog?.title).toBe("Verifikasi NIK belum tersedia"));
    expect(view().holders?.items[0]?.nik.error).not.toBe("NIK tidak ditemukan di Dukcapil.");
    expect(view().holders?.items[0]?.nik.value).toBe("3171000000001234");
    const retry = view().dialog?.primary;
    act(() => retry && "onClick" in retry && retry.onClick());
    await waitFor(() => expect(view().holders?.items[0]?.nik.success).toBe("NIK terverifikasi"));
    expect(view().dialog).toBeUndefined();
    expect(attempts).toBe(2);
  });

  it("submit tanpa data lengkap menampilkan galat, tanpa request", async () => {
    replace.mockClear();
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().submit.onSubmit());
    expect(view().holders?.items[0]?.nik.error).toBe("NIK harus 16 digit angka.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("submit lengkap membuat booking dan lanjut ke pembayaran", async () => {
    replace.mockClear();
    push.mockClear();
    const { view } = await readyView();
    add(view, "cat_vip");
    add(view, "cat_festival");
    act(() => view().buyer.email.onChange("rina@example.com"));
    await enterVerifiedNik(view, 0, "3171000000001234");
    await enterVerifiedNik(view, 1, "3171000000005678");
    await submitAndConfirm(view);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(expect.stringMatching(/^\/orders\/RB-\d+\/pay$/)),
    );
    // `replace`, bukan `push`: Back dari pembayaran tidak boleh kembali ke formulir yang sudah terpakai.
    expect(push).not.toHaveBeenCalled();
  });

  it("submit lengkap membuka ringkasan pesanan dulu; Periksa lagi menutupnya tanpa membuat booking", async () => {
    replace.mockClear();
    let created = false;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/bookings`, () => {
        created = true;
        return HttpResponse.json({ meta: { code: 201, message: "Created" }, data: { booking_id: "RB-X" } });
      }),
    );
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().buyer.email.onChange(" rina@example.com "));
    await enterVerifiedNik(view, 0, "3171000000001234");
    act(() => view().submit.onSubmit());
    await waitFor(() => expect(view().dialog?.title).toBe("Periksa pesananmu"));
    const details = view().dialog?.details ?? [];
    expect(details.map((detail) => detail.label)).toEqual([
      "Acara",
      "Email",
      "VIP × 1",
      "NIK tiket 1",
      "Total bayar",
    ]);
    expect(details.find((detail) => detail.label === "NIK tiket 1")?.value).toBe("3171000000001234");
    expect(details.find((detail) => detail.label === "Email")?.value).toBe("rina@example.com");
    expect(created).toBe(false);

    const back = view().dialog?.secondary;
    act(() => back && "onClick" in back && back.onClick());
    expect(view().dialog).toBeUndefined();
    expect(created).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  describe("stok berubah saat submit (409 INSUFFICIENT_STOCK)", () => {
    const insufficient = () =>
      http.post(`${MOCK_API_BASE_URL}/bookings`, () =>
        HttpResponse.json(
          {
            meta: { code: 409, message: "Stok VIP tidak mencukupi", error_code: "INSUFFICIENT_STOCK" },
            data: { available: 0, requested: 1 },
          },
          { status: 409 },
        ),
      );
    // `expires_at` tetap per grant: berubah berarti sesi booking baru dan formulir direset.
    const grantExpiresAt = new Date(Date.now() + 300_000).toISOString();
    const stockOf = (available: Readonly<Record<string, number>>) => {
      const expiresAt = grantExpiresAt;
      return http.get(`${MOCK_API_BASE_URL}/events/:id/tickets`, () =>
        HttpResponse.json({
          meta: { code: 200, message: "Success" },
          data: {
            event: { name: "Konser A" },
            session: {
              expires_at: expiresAt,
              server_time: new Date().toISOString(),
            },
            categories: Object.entries(available).map(([id, left]) => ({
              id,
              name: id === "cat_vip" ? "VIP" : "Festival",
              description: "",
              price: 100_000,
              available: left,
            })),
            rules: { max_tickets_per_order: 3 },
          },
        }),
      );
    };

    async function submitIntoStockError(view: () => BookingViewProps) {
      add(view, "cat_vip");
      act(() => view().buyer.email.onChange("rina@example.com"));
      await enterVerifiedNik(view, 0, "3171000000001234");
      await submitAndConfirm(view);
      await waitFor(() => expect(view().dialog?.title).toBe("Tiket tidak tersedia"));
    }

    it("sebagian kategori habis: modal minta pilih kategori lain, pilihan dipangkas ke stok terbaru", async () => {
      replace.mockClear();
      server.use(insufficient(), stockOf({ cat_vip: 5, cat_festival: 5 }));
      const { view } = await readyView();
      server.use(stockOf({ cat_vip: 0, cat_festival: 5 }));
      await submitIntoStockError(view);
      await waitFor(() =>
        expect(view().categories.items.find((item) => item.id === "cat_vip")?.soldOut).toBe(true),
      );
      expect(view().dialog?.primary).toMatchObject({ label: "Pilih kategori lain" });

      const another = view().dialog?.primary;
      act(() => another && "onClick" in another && another.onClick());
      expect(view().dialog).toBeUndefined();
      expect(view().holders).toBeUndefined();
      expect(replace).not.toHaveBeenCalled();
    });

    it("semua habis: hitung mundur 10 detik lalu kembali ke Beranda", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        replace.mockClear();
        server.use(insufficient(), stockOf({ cat_vip: 5, cat_festival: 5 }));
        const { view } = await readyView();
        server.use(stockOf({ cat_vip: 0, cat_festival: 0 }));
        await submitIntoStockError(view);
        await waitFor(() =>
          expect(view().dialog?.primary).toMatchObject({ label: "Kembali ke Beranda (10)" }),
        );

        await act(async () => {
          await vi.advanceTimersByTimeAsync(3000);
        });
        expect(view().dialog?.primary).toMatchObject({ label: "Kembali ke Beranda (7)" });
        expect(replace).not.toHaveBeenCalled();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(7000);
        });
        expect(replace).toHaveBeenCalledWith("/");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it("tamu tidak melihat pilihan alias; NIK diisi manual", async () => {
    const { view } = await readyView();
    add(view, "cat_vip");
    await waitFor(() => expect(view().holders?.items).toHaveLength(1));
    expect(view().holders?.items[0]?.holder).toBeUndefined();
  });

  it("customer masuk memilih alias sebagai pemegang tiket; yang dikirim saved_nik_id, tanpa NIK dan tanpa cek Dukcapil", async () => {
    replace.mockClear();
    const captured: { body?: Record<string, unknown> } = {};
    const validated: string[] = [];
    server.use(savedNiksOf(BUDI_MASKED), captureValidate(validated), captureBooking(captured, "RB-ALIAS"));
    const { view } = await readyView({ signedIn: true });
    add(view, "cat_vip");
    add(view, "cat_festival");
    await waitFor(() => expect(view().holders?.items[0]?.holder?.options).toHaveLength(3));
    const first = () => view().holders?.items[0];
    const second = () => view().holders?.items[1];
    expect(first()?.holder?.options.map((option) => option.label)).toEqual([
      "NIK pemesan · 3171********xx22",
      "Budi · 3171**********33",
      "NIK lain (isi manual)",
    ]);

    act(() => first()?.holder?.onChange("snk_1"));
    expect(first()?.nik).toMatchObject({ value: BUDI_MASKED, readOnly: true });
    expect(first()?.nik.success).toBe("NIK ini sudah terverifikasi di profilmu.");
    expect(first()?.verify).toBeUndefined();
    // Alias yang sudah dipakai tiket 1 tidak bisa dipilih untuk tiket 2 (BR-02).
    expect(second()?.holder?.options[1]).toMatchObject({
      label: "Budi · 3171**********33 (sudah dipakai tiket lain)",
      disabled: true,
    });

    await enterVerifiedNik(view, 1, "3171000000005678");
    await submitAndConfirm(view);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders/RB-ALIAS/pay"));
    expect(captured.body?.tickets).toEqual([
      { category_id: "cat_vip", saved_nik_id: "snk_1" },
      { category_id: "cat_festival", nik: "3171000000005678" },
    ]);
    // Pemegang dari profil tidak dikirim ke Dukcapil; hanya NIK yang diketik.
    expect(validated).toEqual(["3171000000005678"]);
  });

  it("kembali ke isian manual mengosongkan tampilan NIK dari alias", async () => {
    server.use(savedNiksOf(BUDI_MASKED));
    const { view } = await readyView({ signedIn: true });
    add(view, "cat_vip");
    await waitFor(() => expect(view().holders?.items[0]?.holder?.options).toHaveLength(3));
    act(() => view().holders?.items[0]?.holder?.onChange("snk_1"));
    act(() => view().holders?.items[0]?.holder?.onChange(""));
    expect(view().holders?.items[0]?.nik).toMatchObject({ value: "", readOnly: false });
    expect(view().holders?.items[0]?.holder?.value).toBe("");
  });

  it("alias hanya dikenal tersamar: tidak ada dialog Dukcapil, dan tidak ada yang bocor ke /nik/validate", async () => {
    const validated: string[] = [];
    server.use(savedNiksOf("3171**********99"), captureValidate(validated));
    const { view } = await readyView({ signedIn: true });
    add(view, "cat_vip");
    await waitFor(() => expect(view().holders?.items[0]?.holder?.options).toHaveLength(3));
    act(() => view().holders?.items[0]?.holder?.onChange("snk_1"));
    expect(view().dialog).toBeUndefined();
    expect(view().holders?.items[0]?.nik.onBlur).toBeUndefined();
    expect(validated).toEqual([]);
  });

  it.each([
    [409, "NIK sudah dipakai atau stok berubah. Periksa lagi pilihanmu."],
    [400, "Pesanan ditolak. Periksa lagi NIK dan email."],
    [401, "Waktu booking habis. Kamu perlu kembali ke ruang tunggu."],
  ])(
    "submit ditolak server (%i): pesan galat sesuai alasan, tanpa pindah halaman",
    async (status, message) => {
      replace.mockClear();
      server.use(
        http.post(`${MOCK_API_BASE_URL}/bookings`, () =>
          HttpResponse.json({ meta: { code: status, message: "x" } }, { status }),
        ),
      );
      const { view } = await readyView();
      add(view, "cat_vip");
      act(() => view().buyer.email.onChange("rina@example.com"));
      await enterVerifiedNik(view, 0, "3171000000001234");
      await submitAndConfirm(view);
      await waitFor(() => expect(view().error).toBe(message));
      expect(replace).not.toHaveBeenCalled();
    },
  );

  it("submit tanpa respons: dialog koneksi bermasalah, coba lagi mengirim ulang isian yang sama", async () => {
    replace.mockClear();
    let attempts = 0;
    server.use(
      // Putus di sisi browser (route same-origin tidak terjangkau), bukan BE yang tidak menjawab.
      http.post(`${TEST_APP_ORIGIN}/api/account/bookings`, () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.error();
        return HttpResponse.json(
          { meta: { code: 201, message: "Created" }, data: { booking_id: "RB-RETRY" } },
          { status: 201 },
        );
      }),
    );
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().buyer.email.onChange("rina@example.com"));
    await enterVerifiedNik(view, 0, "3171000000001234");
    await submitAndConfirm(view);
    await waitFor(() => expect(view().dialog?.title).toBe("Tidak ada jaringan"));
    expect(view().error).toBeUndefined();
    const retry = view().dialog?.primary;
    act(() => retry && "onClick" in retry && retry.onClick());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders/RB-RETRY/pay"));
    expect(attempts).toBe(2);
  });

  it("grant ditolak (401): cookie grant dilepas dulu, lalu kembali ke Beranda (mode default)", async () => {
    replace.mockClear();
    const ended = endSessionRoute();
    const { result } = renderHook(() => useBookingController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(replace).not.toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/queue`);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(result.current.kind).toBe("status");
  });

  it("grant ditolak tetapi cookie gagal dilepas: tidak pindah (proxy memantulkan), layar kedaluwarsa dengan tombol", async () => {
    replace.mockClear();
    server.use(
      http.post(`${TEST_APP_ORIGIN}/api/session/end`, () => new HttpResponse(null, { status: 500 })),
    );
    const { result } = renderHook(() => useBookingController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.action).toBeTruthy());
    expect(replace).not.toHaveBeenCalled();
  });

  it("mode screen: layar sesi berakhir dengan tombol antre lagi, tanpa redirect otomatis", async () => {
    replace.mockClear();
    const ended = endSessionRoute();
    const container = setupTestContainer({}, { ...testConfig, bookingExpiry: "screen" });
    const { result } = renderHook(() => useBookingController(OPEN_EVENT_ID), {
      wrapper: createWrapper(container),
    });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.action).toBeTruthy());
    // Waktu habis memakai nada peringatan, di dalam kerangka situs (navbar), bukan kartu merah.
    expect(result.current.kind === "status" && result.current.view.tone).toBe("warning");
    expect(result.current.kind === "status" && result.current.view.nav?.loginHref).toBe("/login");
    expect(ended).not.toHaveBeenCalled();
    act(() => result.current.kind === "status" && result.current.view.action?.onClick());
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/queue`));
    expect(ended).toHaveBeenCalledTimes(1);
  });

  describe("waktu booking habis saat formulir terbuka", () => {
    /**
     * Sesi tersisa 1,2 detik; saat hitungan nol FE bertanya ke server dan dijawab 401. Server yang memutuskan
     * (ADR-0005). Jam palsu berjalan mengikuti waktu nyata supaya hitung mundur 5 detik bisa dimajukan.
     */
    async function expireWithForm(answer: "expired" | "still_ok" = "expired") {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      replace.mockClear();
      push.mockClear();
      const ended = endSessionRoute();
      let calls = 0;
      const expiresAt = new Date(Date.now() + 1200).toISOString();
      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/tickets`, () => {
          calls += 1;
          if (calls > 1 && answer === "expired")
            return HttpResponse.json(
              { meta: { code: 401, message: "Grant expired", error_code: "GRANT_TOKEN_INVALID" }, data: {} },
              { status: 401 },
            );
          return HttpResponse.json({
            meta: { code: 200, message: "Success" },
            data: {
              event: { name: "Konser A" },
              session: {
                expires_at: expiresAt,
                server_time: new Date().toISOString(),
              },
              categories: [{ id: "cat_vip", name: "VIP", description: "", price: 100_000, available: 5 }],
              rules: { max_tickets_per_order: 3 },
            },
          });
        }),
      );
      const { view } = await readyView();
      await waitFor(() => expect(view().dialog?.title).toBe("Waktu booking habis"), { timeout: 6000 });
      return { view, ended };
    }

    const tick = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    afterEach(() => vi.useRealTimers());

    it("modal dengan hitung mundur 5 detik, grant dilepas sekali, lalu kembali ke Beranda", async () => {
      const { view, ended } = await expireWithForm();
      expect(view().dialog?.note).toBe("Kamu akan diarahkan ke beranda dalam 5 detik.");
      expect(view().dialog?.secondary).toBeUndefined();
      expect(view().dialog?.primary).toMatchObject({ label: "Kembali ke beranda" });
      // Grant yang sudah kedaluwarsa dilepas, kalau tidak proxy memantulkan Waiting Room kembali ke /book.
      await waitFor(() => expect(ended).toHaveBeenCalledTimes(1));
      expect(replace).not.toHaveBeenCalled();

      await tick(2000);
      expect(view().dialog?.note).toBe("Kamu akan diarahkan ke beranda dalam 3 detik.");
      expect(replace).not.toHaveBeenCalled();

      await tick(3000);
      expect(replace).toHaveBeenCalledWith("/");
      expect(replace).not.toHaveBeenCalledWith(`/events/${OPEN_EVENT_ID}/queue`);
      expect(ended).toHaveBeenCalledTimes(1);
    }, 15000);

    it("server tetap menjawab 200 dengan waktu yang sama: modal tetap muncul saat hitungan nol", async () => {
      const { view } = await expireWithForm("still_ok");
      expect(view().dialog?.primary).toMatchObject({ label: "Kembali ke beranda" });
      await tick(5000);
      expect(replace).toHaveBeenCalledWith("/");
    }, 15000);

    it("tombol Kembali ke beranda dan menutup modal langsung ke Beranda, tanpa menunggu hitung mundur", async () => {
      const { view } = await expireWithForm();
      const home = view().dialog?.primary;
      act(() => home && "onClick" in home && home.onClick());
      expect(replace).toHaveBeenCalledWith("/");

      replace.mockClear();
      act(() => view().dialog?.onDismiss());
      expect(replace).toHaveBeenCalledWith("/");
    }, 15000);

    it("gagal melepas grant tidak menahan pindah ke Beranda", async () => {
      const { view } = await expireWithForm();
      server.use(
        http.post(`${TEST_APP_ORIGIN}/api/session/end`, () => new HttpResponse(null, { status: 500 })),
      );
      await tick(5000);
      expect(view().dialog).toBeDefined();
      expect(replace).toHaveBeenCalledWith("/");
    }, 15000);

    it("route tersembunyi lalu tampil lagi setelah antri ulang: grant baru tidak dilepas dan tidak dilempar ke Beranda", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      replace.mockClear();
      const ended = endSessionRoute();
      let calls = 0;
      const sessionBody = (expiresAt: string) =>
        HttpResponse.json({
          meta: { code: 200, message: "Success" },
          data: {
            event: { name: "Konser A" },
            session: { expires_at: expiresAt, server_time: new Date().toISOString() },
            categories: [{ id: "cat_vip", name: "VIP", description: "", price: 100_000, available: 5 }],
            rules: { max_tickets_per_order: 3 },
          },
        });
      const firstExpiry = new Date(Date.now() + 1200).toISOString();
      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/tickets`, () => {
          calls += 1;
          if (calls === 1) return sessionBody(firstExpiry);
          if (calls === 2)
            return HttpResponse.json(
              { meta: { code: 401, message: "Grant expired", error_code: "GRANT_TOKEN_INVALID" }, data: {} },
              { status: 401 },
            );
          // Antri ulang: grant baru dengan jendela 5 menit yang baru.
          return sessionBody(new Date(Date.now() + 300_000).toISOString());
        }),
      );
      // Next menyembunyikan route yang ditinggalkan dan menampilkannya lagi tanpa memasang ulang (ADR-0007).
      let mode: "visible" | "hidden" = "visible";
      const container = setupTestContainer();
      await admitToQueue(container);
      const Base = createWrapper(container);
      const Wrapper = ({ children }: { children: ReactNode }) => (
        <Base>
          <Activity mode={mode}>{children}</Activity>
        </Base>
      );
      const hook = renderHook(() => useBookingController(OPEN_EVENT_ID), { wrapper: Wrapper });
      await waitFor(() => expect(hook.result.current.kind).toBe("ready"));
      const view = () => {
        const screen = hook.result.current;
        if (screen.kind !== "ready") throw new Error("belum siap");
        return screen.view;
      };
      await waitFor(() => expect(view().dialog?.title).toBe("Waktu booking habis"), { timeout: 6000 });
      await waitFor(() => expect(ended).toHaveBeenCalledTimes(1));
      await tick(5000);
      expect(replace).toHaveBeenCalledWith("/");

      mode = "hidden";
      hook.rerender();
      replace.mockClear();
      mode = "visible";
      hook.rerender();

      await waitFor(() => expect(calls).toBeGreaterThanOrEqual(3));
      await waitFor(() => expect(hook.result.current.kind === "ready" && !view().dialog).toBe(true));
      await tick(1000);
      expect(ended).toHaveBeenCalledTimes(1);
      expect(replace).not.toHaveBeenCalled();
    }, 20000);
  });

  describe("customer masuk", () => {
    const sessionBody = (account: Record<string, string> | null) =>
      http.get(`${TEST_APP_ORIGIN}/api/auth/session`, () =>
        HttpResponse.json({ meta: { code: 200, message: "Success" }, data: { account } }),
      );
    it("email pemesan terisi dari akun dan tidak bisa diubah; email akun yang dikirim", async () => {
      replace.mockClear();
      const captured: { body?: Record<string, unknown> } = {};
      server.use(captureBooking(captured, "RB-ACCOUNT"));
      const { view } = await readyView({ signedIn: true });
      await waitFor(() =>
        expect(view().buyer.email).toMatchObject({ value: "you@example.com", readOnly: true }),
      );
      expect(view().buyer.hint).toBe("E-tiket dikirim ke email akunmu. Email ini tidak bisa diubah di sini.");

      add(view, "cat_vip");
      await enterVerifiedNik(view, 0, "3171000000001234");
      act(() => view().submit.onSubmit());
      await waitFor(() => expect(view().dialog?.title).toBe("Periksa pesananmu"));
      expect(view().dialog?.details?.find((detail) => detail.label === "Email")?.value).toBe(
        "you@example.com",
      );
      const confirm = view().dialog?.primary;
      act(() => confirm && "onClick" in confirm && confirm.onClick());
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders/RB-ACCOUNT/pay"));
      expect(captured.body).toMatchObject({ contact_email: "you@example.com" });
      expect(captured.body?.tickets).toEqual([{ category_id: "cat_vip", nik: "3171000000001234" }]);
    });

    it("memilih NIK pemesan: tampil tersamar, tanpa cek Dukcapil, dan yang dikirim use_account_nik", async () => {
      replace.mockClear();
      const validated: string[] = [];
      const captured: { body?: Record<string, unknown> } = {};
      server.use(savedNiksOf(), captureValidate(validated), captureBooking(captured, "RB-ACCOUNT"));
      const { view } = await readyView({ signedIn: true });
      add(view, "cat_vip");
      await waitFor(() =>
        expect(view().holders?.items[0]?.holder?.options.map((o) => o.value)).toEqual(["owner", ""]),
      );
      expect(view().holders?.items[0]?.verify).toBeDefined();

      act(() => view().holders?.items[0]?.holder?.onChange("owner"));
      expect(view().holders?.items[0]?.nik).toMatchObject({ value: "3171********xx22", readOnly: true });
      expect(view().holders?.items[0]?.verify).toBeUndefined();

      await submitAndConfirm(view);
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders/RB-ACCOUNT/pay"));
      expect(captured.body?.tickets).toEqual([{ category_id: "cat_vip", use_account_nik: true }]);
      expect(validated).toEqual([]);
    });

    it("NIK pemesan yang sudah dipakai satu tiket tidak bisa dipilih untuk tiket lain", async () => {
      server.use(savedNiksOf(), captureValidate([]));
      const { view } = await readyView({ signedIn: true });
      add(view, "cat_vip");
      add(view, "cat_festival");
      await waitFor(() => expect(view().holders?.items[1]?.holder?.options).toHaveLength(2));
      act(() => view().holders?.items[0]?.holder?.onChange("owner"));
      expect(view().holders?.items[1]?.holder?.options[0]).toMatchObject({ value: "owner", disabled: true });
      expect(view().holders?.items[0]?.holder?.options[0]).toMatchObject({ value: "owner", disabled: false });
    });

    it("akun tanpa NIK terverifikasi: NIK pemesan tidak ditawarkan, isi manual tetap ada", async () => {
      server.use(
        savedNiksOf(),
        sessionBody({ email: "rina@example.com", nik_masked: "" }),
        // BE menjawab tiket tanpa NIK terverifikasi: `account` tidak membawa NIK tersamar.
        http.get(`${MOCK_API_BASE_URL}/events/:eventId/tickets`, () => {
          const now = Date.now();
          const category = (id: string, name: string, price: number) => ({
            id,
            name,
            description: name,
            price,
            available: 10,
            max_per_order: 5,
          });
          return HttpResponse.json({
            meta: { code: 200, message: "Success" },
            data: {
              event: {
                id: OPEN_EVENT_ID,
                name: "Konser",
                date: new Date(now + 86_400_000).toISOString(),
                venue: "GBK, Jakarta",
                image_url: "https://example.test/a.jpg",
              },
              session: {
                expires_at: new Date(now + 600_000).toISOString(),
                ttl_seconds: 600,
                server_time: new Date(now).toISOString(),
              },
              categories: [
                category("cat_vip", "VIP", 1_500_000),
                category("cat_festival", "Festival", 850_000),
              ],
              rules: { max_tickets_per_order: 5, one_nik_per_ticket: true },
              account: null,
            },
          });
        }),
      );
      const { view } = await readyView({ signedIn: true });
      add(view, "cat_vip");
      await waitFor(() => expect(view().buyer.email.value).toBe("rina@example.com"));
      expect(view().holders?.items[0]?.holder?.options.map((option) => option.value)).toEqual([""]);
    });

    it("tamu: tanpa pilihan pemegang tetapi dengan tombol verifikasi; email bisa diketik", async () => {
      const { view } = await readyView();
      add(view, "cat_vip");
      await waitFor(() => expect(view().holders?.items).toHaveLength(1));
      expect(view().holders?.items[0]?.holder).toBeUndefined();
      expect(view().holders?.items[0]?.verify).toMatchObject({
        label: "Verifikasi Dukcapil",
        disabled: true,
      });
      expect(view().buyer.email.readOnly).toBeUndefined();
      act(() => view().buyer.email.onChange("tamu@example.com"));
      expect(view().buyer.email.value).toBe("tamu@example.com");
    });
  });

  describe("tombol Verifikasi Dukcapil", () => {
    const click = (view: () => BookingViewProps) => act(() => view().holders?.items[0]?.verify?.onClick());
    const typeNik = (view: () => BookingViewProps, nik = "3171000000001234") =>
      act(() => view().holders?.items[0]?.nik.onChange(nik));
    const tick = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    afterEach(() => vi.useRealTimers());

    it("tamu: tombol mati sampai 16 digit, lalu mengecek NIK dan mati selama jeda NIK_VERIFY_COOLDOWN_MS", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const validated: string[] = [];
      server.use(captureValidate(validated));
      const { view } = await readyView();
      add(view, "cat_vip");
      await waitFor(() => expect(view().holders?.items[0]?.verify).toBeDefined());
      expect(view().holders?.items[0]?.verify?.disabled).toBe(true);

      typeNik(view, "3171");
      expect(view().holders?.items[0]?.verify?.disabled).toBe(true);
      typeNik(view);
      expect(view().holders?.items[0]?.verify?.disabled).toBe(false);

      click(view);
      await waitFor(() => expect(view().holders?.items[0]?.nik.success).toBe("NIK terverifikasi"));
      expect(validated).toEqual(["3171000000001234"]);
      // Pengecekan selesai tetapi jeda masih berjalan: tombol tetap mati.
      expect(view().holders?.items[0]?.verify).toMatchObject({ busy: false, disabled: true });

      // Jam palsu ikut berjalan mengikuti waktu nyata selama menunggu respons, jadi batasnya diberi ruang 1,5 detik.
      await tick(NIK_VERIFY_COOLDOWN_MS - 1500);
      expect(view().holders?.items[0]?.verify?.disabled).toBe(true);
      await tick(2000);
      expect(view().holders?.items[0]?.verify?.disabled).toBe(false);

      // Setelah jeda, menekan lagi untuk NIK yang sama tetap bertanya ke server (coba lagi).
      click(view);
      await waitFor(() => expect(validated).toHaveLength(2));
    });

    it("tekanan kedua selama jeda diabaikan; jeda per slot tiket", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const validated: string[] = [];
      server.use(captureValidate(validated));
      const { view } = await readyView();
      add(view, "cat_vip");
      add(view, "cat_festival");
      await waitFor(() => expect(view().holders?.items).toHaveLength(2));
      typeNik(view);
      act(() => view().holders?.items[1]?.nik.onChange("3171000000005678"));

      click(view);
      click(view);
      await waitFor(() => expect(validated).toEqual(["3171000000001234"]));
      expect(view().holders?.items[0]?.verify?.disabled).toBe(true);
      // Slot lain tidak ikut terkunci.
      expect(view().holders?.items[1]?.verify?.disabled).toBe(false);
    });

    it("klik lalu blur untuk NIK yang sama hanya membuat satu permintaan", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const validated: string[] = [];
      server.use(
        http.post(`${MOCK_API_BASE_URL}/nik/validate`, async ({ request }) => {
          const { nik } = (await request.json()) as { nik: string };
          validated.push(nik);
          await new Promise((resolve) => setTimeout(resolve, 200));
          return HttpResponse.json({
            meta: { code: 200, message: "NIK is valid" },
            data: { nik, valid: true, name: "PEMILIK AKUN", status: "ACTIVE" },
          });
        }),
      );
      const { view } = await readyView();
      add(view, "cat_vip");
      typeNik(view);
      click(view);
      act(() => view().holders?.items[0]?.nik.onBlur?.());
      await tick(500);
      expect(validated).toEqual(["3171000000001234"]);
    });

    it("slot yang hilang (tiket dikurangi) tidak menyisakan jeda untuk tiket baru di slot yang sama", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      server.use(captureValidate([]));
      const { view } = await readyView();
      add(view, "cat_vip");
      typeNik(view);
      click(view);
      await waitFor(() => expect(view().holders?.items[0]?.nik.success).toBe("NIK terverifikasi"));
      expect(view().holders?.items[0]?.verify?.disabled).toBe(true);

      act(() =>
        view()
          .categories.items.find((item) => item.id === "cat_vip")
          ?.onRemove(),
      );
      add(view, "cat_vip");
      typeNik(view);
      expect(view().holders?.items[0]?.verify?.disabled).toBe(false);
    });

    it("customer masuk: NIK lain yang diketik dicek lewat tombol yang sama", async () => {
      const validated: string[] = [];
      server.use(captureValidate(validated));
      const { view } = await readyView({ signedIn: true });
      add(view, "cat_vip");
      await waitFor(() => expect(view().holders?.items[0]?.verify).toBeDefined());
      typeNik(view);
      click(view);
      await waitFor(() => expect(validated).toEqual(["3171000000001234"]));
    });
  });

  describe("email pemesan", () => {
    it(`tamu: dibatasi ${EMAIL_MAX_LENGTH} karakter; email lebih panjang yang masuk lewat jalan lain memblokir submit`, async () => {
      const { view } = await readyView();
      add(view, "cat_vip");
      expect(view().buyer.email.maxLength).toBe(EMAIL_MAX_LENGTH);
      await enterVerifiedNik(view, 0, "3171000000001234");
      act(() => view().buyer.email.onChange(`${"a".repeat(EMAIL_MAX_LENGTH)}@example.com`));
      expect(view().buyer.email.error).toBe(`Email maksimal ${EMAIL_MAX_LENGTH} karakter.`);
      expect(view().submit.disabled).toBe(true);
      act(() => view().buyer.email.onChange("rina@example.com"));
      expect(view().buyer.email.error).toBeUndefined();
      expect(view().submit.disabled).toBe(false);
    });
  });

  it("jaringan gagal tanpa data: layar status error", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/tickets`, () => HttpResponse.error()));
    const { result } = renderHook(() => useBookingController(OPEN_EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.tone).toBe("error"));
  });
});
