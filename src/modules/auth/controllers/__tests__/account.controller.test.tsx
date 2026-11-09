// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer, setupTestContainer } from "@/test/support";
import { useAccountController } from "../account.controller";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const server = setupMockServer();

/** Menekan aksi dialog berupa tombol. */
function click(action: { label: string; onClick: () => void } | { label: string; href: string } | undefined) {
  if (action && "onClick" in action) action.onClick();
}

async function mountSignedIn() {
  const container = setupTestContainer();
  await container.cradle.verifyLoginUseCase("mt_account");
  const hook = renderHook(() => useAccountController(), { wrapper: createWrapper(container) });
  await waitFor(() => expect(hook.result.current.kind).toBe("ready"));
  const ready = () => {
    const view = hook.result.current;
    if (view.kind !== "ready") throw new Error("belum siap");
    return view;
  };
  return { ...hook, ready };
}

describe("useAccountController", () => {
  it("tamu melihat ajakan masuk, bukan redirect paksa", async () => {
    const { result } = renderHook(() => useAccountController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kind).toBe("signedOut"));
    expect(result.current.kind === "signedOut" && result.current.login.href).toBe("/login");
  });

  it("menampilkan profil dari GET /accounts/me dan alias dari server", async () => {
    const { ready } = await mountSignedIn();
    await waitFor(() => expect(ready().profile.fields[0]).toEqual({ label: "Nama", value: "JOHN DOE" }));
    expect(ready().profile.fields.map((field) => field.value)).toEqual([
      "JOHN DOE",
      "you@example.com",
      "3171********xx22",
      "1 Oktober 2026",
    ]);
    expect(ready().saved.items.map((item) => item.label)).toEqual(["Budi"]);
    expect(ready().saved.count).toBe("1/5");
    expect(ready().profile).toMatchObject({ name: "JOHN DOE", initials: "JD" });
    expect(ready().saved.items[0]?.initials).toBe("B");
  });

  it("profil gagal dimuat: tetap tampil dengan email dan NIK dari sesi", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/accounts/me`, () => HttpResponse.error()));
    const { ready } = await mountSignedIn();
    expect(ready().profile.fields).toEqual([
      { label: "Email", value: "you@example.com" },
      { label: "NIK terdaftar", value: "3171********xx22" },
    ]);
    expect(ready().profile).toMatchObject({ name: "you@example.com", initials: "YE" });
  });

  it("menambah alias lalu daftar dimuat ulang dan form dikosongkan", async () => {
    const { ready } = await mountSignedIn();
    act(() => {
      ready().add?.label.onChange("Sari");
      ready().add?.nik.onChange("3171 0000 0000 0044");
    });
    expect(ready().add?.nik.value).toBe("3171000000000044");
    act(() => ready().add?.submit.onSubmit());
    await waitFor(() => expect(ready().saved.items.map((item) => item.label)).toEqual(["Budi", "Sari"]));
    expect(ready().add?.nik.value).toBe("");
  });

  it("isian alias tidak valid ditolak di form tanpa request", async () => {
    let posted = false;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/accounts/me/saved-niks`, () => {
        posted = true;
        return HttpResponse.json({ meta: { code: 201, message: "NIK saved" } }, { status: 201 });
      }),
    );
    const { ready } = await mountSignedIn();
    act(() => ready().add?.nik.onChange("31710000"));
    act(() => ready().add?.submit.onSubmit());
    expect(ready().add?.label.error).toBe("Isi nama alias.");
    expect(ready().add?.notice).toContain("UU Pelindungan Data Pribadi");
    expect(ready().add?.nik.error).toBe("NIK harus 16 digit angka.");
    expect(posted).toBe(false);
  });

  it("NIK ditolak Dukcapil: modal Periksa NIK, Ubah data memfokus field NIK dengan isian lama", async () => {
    const { ready } = await mountSignedIn();
    act(() => {
      ready().add?.label.onChange("X");
      ready().add?.nik.onChange("3171000000000099");
    });
    act(() => ready().add?.submit.onSubmit());
    await waitFor(() => expect(ready().dialog?.title).toBe("Periksa NIK-mu"));
    expect(ready().saved.error).toBeUndefined();
    expect(ready().dialog?.secondary).toBeUndefined();
    const edit = ready().dialog?.primary;
    act(() => edit && "onClick" in edit && edit.onClick());
    expect(ready().dialog).toBeUndefined();
    expect(ready().add?.nik).toMatchObject({ value: "3171000000000099", focusKey: 1 });
  });

  it("Dukcapil tidak menjawab: modal verifikasi belum tersedia, isian tetap, coba lagi mengirim ulang", async () => {
    let attempts = 0;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/accounts/me/saved-niks`, () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.error();
        return HttpResponse.json({ meta: { code: 201, message: "NIK saved" }, data: {} }, { status: 201 });
      }),
    );
    const { ready } = await mountSignedIn();
    act(() => {
      ready().add?.label.onChange("Sari");
      ready().add?.nik.onChange("3171000000000044");
    });
    act(() => ready().add?.submit.onSubmit());
    await waitFor(() => expect(ready().dialog?.title).toBe("Verifikasi NIK belum tersedia"));
    // Timeout tidak pernah menyebut NIK salah, dan isian tidak hilang.
    expect(ready().add?.nik.error).toBeUndefined();
    expect(ready().add?.label.value).toBe("Sari");
    expect(ready().dialog?.secondary?.label).toBe("Ubah data");
    const retry = ready().dialog?.primary;
    act(() => retry && "onClick" in retry && retry.onClick());
    await waitFor(() => expect(ready().dialog).toBeUndefined());
    expect(attempts).toBe(2);
  });

  it("mengubah nama alias tanpa mengirim NIK, lalu form tambah kembali", async () => {
    let body: unknown;
    server.use(
      http.patch(`${MOCK_API_BASE_URL}/accounts/me/saved-niks/:id`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ meta: { code: 200, message: "Saved NIK updated" }, data: {} });
      }),
    );
    const { ready } = await mountSignedIn();
    act(() => ready().saved.items[0]?.edit.onClick());
    expect(ready().add).toBeUndefined();
    const form = () => ready().saved.items[0]?.form;
    expect(form()?.label.value).toBe("Budi");
    expect(form()?.nik.value).toBe("");
    act(() => form()?.label.onChange("Budi S"));
    act(() => form()?.submit.onSubmit());
    await waitFor(() => expect(body).toEqual({ label: "Budi S" }));
    await waitFor(() => expect(ready().saved.items[0]?.form).toBeUndefined());
    expect(ready().add).toBeDefined();
  });

  it("mengganti NIK alias lewat form ubah", async () => {
    const { ready } = await mountSignedIn();
    act(() => ready().saved.items[0]?.edit.onClick());
    act(() => ready().saved.items[0]?.form?.nik.onChange("3171000000000044"));
    act(() => ready().saved.items[0]?.form?.submit.onSubmit());
    await waitFor(() => expect(ready().saved.items[0]?.nikMasked).toBe("3171********xx44"));
  });

  it("batal mengubah menutup form tanpa request", async () => {
    const { ready } = await mountSignedIn();
    act(() => ready().saved.items[0]?.edit.onClick());
    act(() => ready().saved.items[0]?.form?.cancel?.onClick());
    expect(ready().saved.items[0]?.form).toBeUndefined();
    expect(ready().add?.label.value).toBe("");
  });

  it("menghapus alias lewat dialog konfirmasi", async () => {
    const { ready } = await mountSignedIn();
    act(() => ready().saved.items[0]?.remove.onClick());
    expect(ready().dialog).toMatchObject({
      tone: "error",
      title: "Hapus alias?",
      description: "Budi (3171********xx33) tidak bisa dipilih lagi saat membeli tiket.",
    });
    act(() => click(ready().dialog?.secondary));
    expect(ready().dialog).toBeUndefined();
    expect(ready().saved.items).toHaveLength(1);

    act(() => ready().saved.items[0]?.remove.onClick());
    act(() => click(ready().dialog?.primary));
    await waitFor(() => expect(ready().saved.items).toEqual([]));
    expect(ready().dialog).toBeUndefined();
  });

  it("sesi habis saat menyimpan alias: dialog sesi berakhir dengan tautan masuk lagi", async () => {
    server.use(
      http.post(`${MOCK_API_BASE_URL}/accounts/me/saved-niks`, () =>
        HttpResponse.json({ meta: { code: 401, message: "Unauthorized" } }, { status: 401 }),
      ),
      http.post(`${MOCK_API_BASE_URL}/auth/refresh`, () =>
        HttpResponse.json({ meta: { code: 401, message: "Session ended" } }, { status: 401 }),
      ),
    );
    const { ready } = await mountSignedIn();
    act(() => {
      ready().add?.label.onChange("Sari");
      ready().add?.nik.onChange("3171000000000044");
    });
    act(() => ready().add?.submit.onSubmit());
    await waitFor(() => expect(ready().dialog?.title).toBe("Sesi berakhir"));
    expect(ready().dialog?.primary).toEqual({ label: "Masuk lagi", href: "/login?session=expired" });
    expect(ready().saved.error).toBeUndefined();
  });

  // BE tidak terjangkau dari route same-origin: gateway menjawab 502, jadi browser melihat galat server, bukan koneksi.
  it("hapus alias gagal karena BE tidak terjangkau: dialog terjadi kesalahan, coba lagi menghapus", async () => {
    let attempts = 0;
    server.use(
      http.delete(`${MOCK_API_BASE_URL}/accounts/me/saved-niks/:id`, () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.error();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { ready } = await mountSignedIn();
    act(() => ready().saved.items[0]?.remove.onClick());
    act(() => click(ready().dialog?.primary));
    await waitFor(() => expect(ready().dialog?.title).toBe("Terjadi kesalahan"));
    act(() => click(ready().dialog?.primary));
    // Override di atas tidak mengubah state mock, jadi yang diperiksa adalah permintaan ulang dan dialog yang tertutup.
    await waitFor(() => expect(ready().dialog).toBeUndefined());
    expect(attempts).toBe(2);
  });

  it("keluar menghapus sesi lalu kembali ke Home", async () => {
    push.mockClear();
    const { ready, result } = await mountSignedIn();
    act(() => ready().signOut.onClick());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(result.current.kind).toBe("signedOut");
  });
});
