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

/**
 * Asumsi FE (docs/api/contract-assumptions.md): BE menambah `nik` lengkap di daftar NIK tersimpan. Kontrak
 * hanya membawa `nik_masked`; mock bawaan sudah menyertakan `nik`, dan di sini daftarnya dibuat eksplisit.
 */
/** Submit membuka ringkasan pesanan; booking baru dibuat setelah customer memilih lanjut. */
async function submitAndConfirm(view: () => BookingViewProps) {
  act(() => view().submit.onSubmit());
  await waitFor(() => expect(view().dialog?.title).toBe("Periksa pesananmu"));
  const confirm = view().dialog?.primary;
  act(() => confirm && "onClick" in confirm && confirm.onClick());
}

const savedNiksOf = (...niks: string[]) =>
  http.get(`${MOCK_API_BASE_URL}/accounts/me/saved-niks`, () =>
    HttpResponse.json({
      meta: { code: 200, message: "Success" },
      data: {
        max_entries: 5,
        saved_niks: niks.map((nik, index) => ({
          id: `snk_${index + 1}`,
          nik,
          nik_masked: `${nik.slice(0, 4)}********xx${nik.slice(-2)}`,
          label: "Budi",
          verified_at: "2026-10-20T08:11:00Z",
          status: "VERIFIED",
        })),
      },
    }),
  );
const savedNiksWithFullNik = savedNiksOf("3171000000000033");

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

  it("NIK tiket menolak digit setelah ke-16", async () => {
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().holders?.items[0]?.nik.onChange("31710000000012349999"));
    expect(view().holders?.items[0]?.nik.value).toBe("3171000000001234");
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

  it("NIK tidak cocok di Dukcapil membuka modal Periksa NIK; Ubah data memfokus field tiket itu", async () => {
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().holders?.items[0]?.nik.onChange("3171000000000099"));
    act(() => view().holders?.items[0]?.nik.onBlur?.());
    await waitFor(() => expect(view().dialog?.title).toBe("Periksa NIK-mu"));
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
    act(() => view().holders?.items[0]?.nik.onBlur?.());
    await waitFor(() => expect(view().dialog?.title).toBe("Verifikasi NIK belum tersedia"));
    expect(view().holders?.items[0]?.nik.error).not.toBe("NIK tidak ditemukan di Dukcapil.");
    expect(view().holders?.items[0]?.nik.value).toBe("3171000000001234");
    const retry = view().dialog?.primary;
    act(() => retry && "onClick" in retry && retry.onClick());
    await waitFor(() =>
      expect(view().holders?.items[0]?.nik.success).toBe("Terverifikasi atas nama WARGA 1234"),
    );
    expect(view().dialog).toBeUndefined();
    expect(attempts).toBe(2);
  });

  it("submit tanpa data lengkap menampilkan galat, tanpa request", async () => {
    push.mockClear();
    const { view } = await readyView();
    add(view, "cat_vip");
    act(() => view().submit.onSubmit());
    expect(view().holders?.items[0]?.nik.error).toBe("NIK harus 16 digit angka.");
    expect(push).not.toHaveBeenCalled();
  });

  it("submit lengkap membuat booking dan lanjut ke pembayaran", async () => {
    push.mockClear();
    const { view } = await readyView();
    add(view, "cat_vip");
    add(view, "cat_festival");
    act(() => view().buyer.email.onChange("rina@example.com"));
    act(() => view().holders?.items[0]?.nik.onChange("3171000000001234"));
    act(() => view().holders?.items[1]?.nik.onChange("3171000000005678"));
    await submitAndConfirm(view);
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/orders\/RB-\d+\/pay$/)));
  });

  it("submit lengkap membuka ringkasan pesanan dulu; Periksa lagi menutupnya tanpa membuat booking", async () => {
    push.mockClear();
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
    act(() => view().holders?.items[0]?.nik.onChange("3171000000001234"));
    act(() => view().submit.onSubmit());
    await waitFor(() => expect(view().dialog?.title).toBe("Periksa pesananmu"));
    const details = view().dialog?.details ?? [];
    expect(details.map((detail) => detail.label)).toEqual(["Acara", "Email", "VIP × 1", "Total bayar"]);
    expect(details.find((detail) => detail.label === "Email")?.value).toBe("rina@example.com");
    expect(created).toBe(false);

    const back = view().dialog?.secondary;
    act(() => back && "onClick" in back && back.onClick());
    expect(view().dialog).toBeUndefined();
    expect(created).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("tamu tidak melihat pilihan alias; NIK diisi manual", async () => {
    const { view } = await readyView();
    add(view, "cat_vip");
    await waitFor(() => expect(view().holders?.items).toHaveLength(1));
    expect(view().holders?.items[0]?.holder).toBeUndefined();
  });

  it("customer masuk memilih alias sebagai pemegang tiket; NIK lengkapnya yang dikirim", async () => {
    push.mockClear();
    let tickets: unknown;
    server.use(
      savedNiksWithFullNik,
      http.post(`${MOCK_API_BASE_URL}/bookings`, async ({ request }) => {
        tickets = ((await request.json()) as { tickets: unknown }).tickets;
        return HttpResponse.json(
          { meta: { code: 201, message: "Created" }, data: { booking_id: "RB-ALIAS" } },
          { status: 201 },
        );
      }),
    );
    const { view } = await readyView({ signedIn: true });
    add(view, "cat_vip");
    add(view, "cat_festival");
    await waitFor(() => expect(view().holders?.items[0]?.holder).toBeDefined());
    const first = () => view().holders?.items[0];
    const second = () => view().holders?.items[1];
    expect(first()?.holder?.options.map((option) => option.label)).toEqual([
      "Isi NIK manual",
      "Budi · 3171********xx33",
    ]);

    act(() => first()?.holder?.onChange("snk_1"));
    expect(first()?.nik).toMatchObject({ value: "3171********xx33", readOnly: true });
    await waitFor(() => expect(first()?.nik.success).toBe("Terverifikasi atas nama JANE DOE"));
    // Alias yang sudah dipakai tiket 1 tidak bisa dipilih untuk tiket 2 (BR-02).
    expect(second()?.holder?.options[1]).toMatchObject({
      label: "Budi · 3171********xx33 (sudah dipakai tiket lain)",
      disabled: true,
    });

    // NIK manual yang sama dengan alias juga dobel.
    act(() => second()?.nik.onChange("3171000000000033"));
    expect(second()?.nik.error).toBe("NIK ini sudah dipakai untuk tiket lain di pesanan ini.");
    expect(view().submit.disabled).toBe(true);

    act(() => second()?.nik.onChange("3171000000005678"));
    act(() => view().buyer.email.onChange("rina@example.com"));
    await submitAndConfirm(view);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/RB-ALIAS/pay"));
    expect(tickets).toEqual([
      { category_id: "cat_vip", nik: "3171000000000033", holder_email: "rina@example.com" },
      { category_id: "cat_festival", nik: "3171000000005678", holder_email: "rina@example.com" },
    ]);
  });

  it("kembali ke isian manual mengosongkan NIK dari alias", async () => {
    server.use(savedNiksWithFullNik);
    const { view } = await readyView({ signedIn: true });
    add(view, "cat_vip");
    await waitFor(() => expect(view().holders?.items[0]?.holder).toBeDefined());
    act(() => view().holders?.items[0]?.holder?.onChange("snk_1"));
    act(() => view().holders?.items[0]?.holder?.onChange(""));
    expect(view().holders?.items[0]?.nik).toMatchObject({ value: "", readOnly: false });
    expect(view().holders?.items[0]?.holder?.value).toBe("");
  });

  it("Alias ditolak Dukcapil: Ubah data mengembalikan slot ke isian manual yang kosong", async () => {
    server.use(savedNiksOf("3171000000000099"));
    const { view } = await readyView({ signedIn: true });
    add(view, "cat_vip");
    await waitFor(() => expect(view().holders?.items[0]?.holder).toBeDefined());
    act(() => view().holders?.items[0]?.holder?.onChange("snk_1"));
    await waitFor(() => expect(view().dialog?.title).toBe("Periksa NIK-mu"));
    expect(view().holders?.items[0]?.nik).toMatchObject({ value: "3171********xx99", readOnly: true });

    const edit = view().dialog?.primary;
    act(() => edit && "onClick" in edit && edit.onClick());
    expect(view().holders?.items[0]?.holder?.value).toBe("");
    expect(view().holders?.items[0]?.nik).toMatchObject({ value: "", readOnly: false, focusKey: 1 });
  });

  it.each([
    [409, "NIK sudah dipakai atau stok berubah. Periksa lagi pilihanmu."],
    [400, "Pesanan ditolak. Periksa lagi NIK dan email."],
    [401, "Waktu booking habis. Kamu perlu kembali ke ruang tunggu."],
  ])(
    "submit ditolak server (%i): pesan galat sesuai alasan, tanpa pindah halaman",
    async (status, message) => {
      push.mockClear();
      server.use(
        http.post(`${MOCK_API_BASE_URL}/bookings`, () =>
          HttpResponse.json({ meta: { code: status, message: "x" } }, { status }),
        ),
      );
      const { view } = await readyView();
      add(view, "cat_vip");
      act(() => view().buyer.email.onChange("rina@example.com"));
      act(() => view().holders?.items[0]?.nik.onChange("3171000000001234"));
      await submitAndConfirm(view);
      await waitFor(() => expect(view().error).toBe(message));
      expect(push).not.toHaveBeenCalled();
    },
  );

  it("submit tanpa respons: dialog koneksi bermasalah, coba lagi mengirim ulang isian yang sama", async () => {
    push.mockClear();
    let attempts = 0;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/bookings`, () => {
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
    act(() => view().holders?.items[0]?.nik.onChange("3171000000001234"));
    await submitAndConfirm(view);
    await waitFor(() => expect(view().dialog?.title).toBe("Tidak ada jaringan"));
    expect(view().error).toBeUndefined();
    const retry = view().dialog?.primary;
    act(() => retry && "onClick" in retry && retry.onClick());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/RB-RETRY/pay"));
    expect(attempts).toBe(2);
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
    // Waktu habis memakai nada peringatan, di dalam kerangka situs (navbar), bukan kartu merah.
    expect(result.current.kind === "status" && result.current.view.tone).toBe("warning");
    expect(result.current.kind === "status" && result.current.view.nav?.loginHref).toBe("/login");
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
