// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { AppContainer } from "@/di/container";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer, setupTestContainer, TEST_APP_ORIGIN } from "@/test/support";
import { DependencyProvider } from "@/core/controllers/dependencies.context";
import { sessionKeys } from "@/core/controllers/session.queries";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { SAVED_NIK_LABEL_MAX_LENGTH } from "../../domain/auth.constants";
import { useAccountController } from "../account.controller";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const server = setupMockServer();

/** Urutan panggilan route same-origin saat keluar: logout akun, lalu pembuangan grant dan token antrian. */
let signOutCalls: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  signOutCalls = [];
  server.events.on("request:start", ({ request }) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/auth/logout" || pathname === "/api/session/end") signOutCalls.push(pathname);
  });
  server.use(http.post(`${TEST_APP_ORIGIN}/api/session/end`, () => new HttpResponse(null, { status: 204 })));
});

afterEach(() => server.events.removeAllListeners());

/** Menekan aksi dialog berupa tombol. */
function click(action: { label: string; onClick: () => void } | { label: string; href: string } | undefined) {
  if (action && "onClick" in action) action.onClick();
}

/** Wrapper dengan QueryClient yang bisa diperiksa test: satu cache dipakai semua route, seperti di browser. */
function sharedCacheWrapper(container: AppContainer, client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DependencyProvider dependencies={container.cradle}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </DependencyProvider>
    );
  };
}

async function mountSignedIn() {
  const container = setupTestContainer();
  await container.cradle.verifyLoginUseCase("mt_account");
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  const wrapper = sharedCacheWrapper(container, client);
  const hook = renderHook(() => useAccountController(), { wrapper });
  await waitFor(() => expect(hook.result.current.kind).toBe("ready"));
  const ready = () => {
    const view = hook.result.current;
    if (view.kind !== "ready") throw new Error("belum siap");
    return view;
  };
  return { ...hook, ready, client, wrapper, container };
}

describe("useAccountController", () => {
  it("tamu melihat ajakan masuk, bukan redirect paksa", async () => {
    const { result } = renderHook(() => useAccountController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kind).toBe("signedOut"));
    expect(result.current.kind === "signedOut" && result.current.login.href).toBe("/login");
  });

  it("menampilkan email dan NIK dari sesi, dan alias dari server", async () => {
    const { ready } = await mountSignedIn();
    await waitFor(() => expect(ready().saved.items).toHaveLength(1));
    expect(ready().profile.fields).toEqual([
      { label: "Email", value: "you@example.com" },
      { label: "NIK terdaftar", value: "3171**********22" },
    ]);
    expect(ready().profile).toMatchObject({ name: "you@example.com", initials: "Y" });
    expect(ready().saved.items.map((item) => item.label)).toEqual(["Budi"]);
    expect(ready().saved.count).toBe("1/5");
    expect(ready().saved.items[0]?.initials).toBe("B");
  });

  it("tidak memanggil endpoint di luar kontrak (profil, ubah alias)", async () => {
    const outside: string[] = [];
    server.events.on("request:start", ({ request }) => {
      const { pathname } = new URL(request.url);
      if (pathname.endsWith("/accounts/me") || request.method === "PATCH") outside.push(pathname);
    });
    const { ready } = await mountSignedIn();
    await waitFor(() => expect(ready().saved.items).toHaveLength(1));
    server.events.removeAllListeners();
    expect(outside).toEqual([]);
  });

  it("NIK alias menolak digit setelah ke-16", async () => {
    const { ready } = await mountSignedIn();
    act(() => ready().add?.nik.onChange("31710000000000449999"));
    expect(ready().add?.nik.value).toBe("3171000000000044");
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

  it("alias boleh dikosongkan: NIK tetap tersimpan dengan nama dari 4 digit terakhir", async () => {
    const { ready } = await mountSignedIn();
    act(() => ready().add?.nik.onChange("3171000000000044"));
    act(() => ready().add?.submit.onSubmit());
    await waitFor(() => expect(ready().saved.items.map((item) => item.label)).toEqual(["Budi", "NIK 0044"]));
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
    expect(ready().add?.label.error).toBeUndefined();
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

  it("menghapus alias lewat dialog konfirmasi", async () => {
    const { ready } = await mountSignedIn();
    act(() => ready().saved.items[0]?.remove.onClick());
    expect(ready().dialog).toMatchObject({
      tone: "error",
      illustration: "confirmation",
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

  it("nama alias: simbol dan karakter ke-51 ditolak saat diketik, spasi antar kata tetap bisa", async () => {
    const { ready } = await mountSignedIn();
    expect(ready().add?.label).toMatchObject({
      maxLength: SAVED_NIK_LABEL_MAX_LENGTH,
      hint: "Maksimal 50 karakter, hanya huruf dan angka.",
    });
    act(() => ready().add?.label.onChange("  Budi (adik) #1"));
    expect(ready().add?.label.value).toBe("Budi adik 1");
    act(() => ready().add?.label.onChange("Budi "));
    expect(ready().add?.label.value).toBe("Budi ");
    act(() => ready().add?.label.onChange("Budi Santoso"));
    expect(ready().add?.label.value).toBe("Budi Santoso");
    act(() => ready().add?.label.onChange("a".repeat(SAVED_NIK_LABEL_MAX_LENGTH + 20)));
    expect(ready().add?.label.value).toBe("a".repeat(SAVED_NIK_LABEL_MAX_LENGTH));
    expect(ready().add?.label.error).toBeUndefined();
  });

  it("nama alias yang ditempel dengan simbol tersimpan dalam bentuk yang sudah dibersihkan", async () => {
    let body: unknown;
    server.events.on("request:start", async ({ request }) => {
      if (request.method === "POST" && new URL(request.url).pathname.endsWith("/accounts/me/saved-niks"))
        body = await request.clone().json();
    });
    const { ready } = await mountSignedIn();
    act(() => {
      ready().add?.label.onChange("Sari_Dewi! ");
      ready().add?.nik.onChange("3171000000000044");
    });
    act(() => ready().add?.submit.onSubmit());
    await waitFor(() => expect(ready().saved.items.map((item) => item.label)).toEqual(["Budi", "SariDewi"]));
    server.events.removeAllListeners();
    expect(body).toEqual({ label: "SariDewi", nik: "3171000000000044" });
  });

  it("keluar menghapus sesi lalu mengganti halaman ke Home tanpa menampilkan profil lama", async () => {
    const { ready, result, client, wrapper } = await mountSignedIn();
    act(() => {
      ready().add?.label.onChange("Sari");
      ready().add?.nik.onChange("3171000000000044");
    });
    act(() => ready().signOut.onClick());
    // `replace`, bukan `push`: tombol Back tidak kembali ke halaman profil yang sudah keluar.
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(push).not.toHaveBeenCalled();
    // Grant dan token antrian identitas lama dibuang setelah akun keluar di server, sebelum pindah halaman.
    expect(signOutCalls).toEqual(["/api/auth/logout", "/api/session/end"]);
    expect(result.current).toMatchObject({ kind: "loading", message: "Mengeluarkan akun…" });
    expect(client.getQueryData(sessionKeys.account)).toBeNull();
    expect(client.getQueryData(["auth", "saved-niks"])).toBeUndefined();

    // Route lain dan kunjungan berikutnya ke /account memakai cache yang sama: navbar tamu, layar ajakan masuk.
    const chrome = renderHook(() => useSiteChrome(), { wrapper });
    expect(chrome.result.current.nav.account).toBeUndefined();
    const revisit = renderHook(() => useAccountController(), { wrapper });
    await waitFor(() => expect(revisit.result.current.kind).toBe("signedOut"));
    expect(chrome.result.current.nav.account).toBeUndefined();
  });

  it("respons sesi lama yang mendarat setelah keluar tidak mengembalikan profil ke navbar", async () => {
    const { ready, client, wrapper } = await mountSignedIn();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    let answered = false;
    // Pemeriksaan sesi (misalnya saat tab difokuskan) dijawab server sebelum logout, tetapi baru tiba sesudahnya.
    server.use(
      http.get(`${TEST_APP_ORIGIN}/api/auth/session`, async () => {
        await gate;
        answered = true;
        return HttpResponse.json({
          meta: { code: 200, message: "OK" },
          data: { account: { email: "you@example.com", nik_masked: "3171**********22" } },
        });
      }),
    );
    const staleCheck = client.refetchQueries({ queryKey: sessionKeys.account });
    await waitFor(() => expect(client.isFetching({ queryKey: sessionKeys.account })).toBe(1));

    act(() => ready().signOut.onClick());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    release();
    await waitFor(() => expect(answered).toBe(true));
    await staleCheck;
    await new Promise((done) => setTimeout(done, 0));

    expect(client.getQueryData(sessionKeys.account)).toBeNull();
    const chrome = renderHook(() => useSiteChrome(), { wrapper });
    expect(chrome.result.current.nav.account).toBeUndefined();
  });

  it("pembuangan grant gagal setelah akun keluar: layar tetap keluar dan pindah ke Home", async () => {
    server.use(
      http.post(`${TEST_APP_ORIGIN}/api/session/end`, () => new HttpResponse(null, { status: 500 })),
    );
    const { ready, result, client } = await mountSignedIn();
    act(() => ready().signOut.onClick());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(signOutCalls).toEqual(["/api/auth/logout", "/api/session/end"]);
    expect(result.current.kind).toBe("loading");
    expect(client.getQueryData(sessionKeys.account)).toBeNull();
  });

  it("keluar membuang grant booking dan token antrian yang tersimpan di perangkat", async () => {
    const { ready, container } = await mountSignedIn();
    const { credentialStore } = container.cradle;
    credentialStore.saveGrantToken("evt_konser_a", "grant_lama");
    act(() => ready().signOut.onClick());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(credentialStore.grantToken()).toBeNull();
  });

  it("keluar gagal di server: profil tetap, dialog coba lagi, lalu berhasil keluar", async () => {
    let failures = 0;
    server.use(
      http.post(
        `${TEST_APP_ORIGIN}/api/auth/logout`,
        () => {
          failures += 1;
          return HttpResponse.json({ meta: { code: 500, message: "Internal error" } }, { status: 500 });
        },
        { once: true },
      ),
    );
    const { ready, result, client } = await mountSignedIn();
    act(() => ready().signOut.onClick());
    await waitFor(() => expect(ready().dialog?.title).toBe("Terjadi kesalahan"));
    expect(ready().dialog?.illustration).toBe("error");
    // Cookie masih ada, jadi layar tidak berpura-pura sudah keluar.
    expect(ready().profile.email).toBe("you@example.com");
    expect(client.getQueryData(sessionKeys.account)).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();

    act(() => click(ready().dialog?.primary));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(failures).toBe(1);
    // Percobaan pertama gagal di logout, jadi grant belum disentuh; percobaan kedua menjalankan keduanya.
    expect(signOutCalls).toEqual(["/api/auth/logout", "/api/auth/logout", "/api/session/end"]);
    expect(result.current.kind).toBe("loading");
    expect(client.getQueryData(sessionKeys.account)).toBeNull();
  });

  it("keluar gagal tanpa jaringan: dialog koneksi, tombol keluar aktif lagi", async () => {
    server.use(http.post(`${TEST_APP_ORIGIN}/api/auth/logout`, () => HttpResponse.error()));
    const { ready } = await mountSignedIn();
    act(() => ready().signOut.onClick());
    await waitFor(() => expect(ready().dialog?.illustration).toBe("network"));
    expect(ready().signOut.disabled).toBe(false);
    act(() => ready().dialog?.onDismiss());
    expect(ready().dialog).toBeUndefined();
  });
});
