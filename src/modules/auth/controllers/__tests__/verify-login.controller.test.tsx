// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer, setupTestContainer } from "@/test/support";
import { useVerifyLoginController } from "../verify-login.controller";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

const server = setupMockServer();

afterEach(() => {
  replace.mockClear();
  server.events.removeAllListeners();
  window.history.replaceState(null, "", "/");
});

describe("useVerifyLoginController", () => {
  it("berhasil masuk: 5 detik kemudian otomatis diarahkan ke tujuan", async () => {
    window.history.replaceState(null, "", "/login/verify#token=mt_abc");
    const { result } = renderHook(() => useVerifyLoginController(), {
      wrapper: createWrapper(setupTestContainer()),
    });
    const screen = result.current;
    if (screen.kind !== "confirm") throw new Error("bukan layar konfirmasi");
    act(() => screen.confirm.onClick());
    await waitFor(() => expect(result.current.kind).toBe("done"));
    expect(replace).not.toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders/RB-00912/pay"), { timeout: 7000 });
  }, 10000);

  it("token di fragmen baru dipakai saat tombol ditekan, lalu ke tujuan dari redirect_context", async () => {
    let verifyCalls = 0;
    server.events.on("request:start", ({ request }) => {
      if (request.url.endsWith("/api/auth/verify")) verifyCalls += 1;
    });
    window.history.replaceState(null, "", "/login/verify#token=mt_abc");
    const container = setupTestContainer();
    const { result } = renderHook(() => useVerifyLoginController(), { wrapper: createWrapper(container) });

    const screen = result.current;
    if (screen.kind !== "confirm") throw new Error("bukan layar konfirmasi");
    expect(screen.confirm.label).toBe("Masuk sekarang");
    expect(verifyCalls).toBe(0);
    act(() => screen.confirm.onClick());
    await waitFor(() => expect(result.current.kind).toBe("done"));
    expect(verifyCalls).toBe(1);
    const done = result.current;
    if (done.kind !== "done") throw new Error("belum selesai");
    expect(done.primary).toEqual({ label: "Kembali ke booking", href: "/orders/RB-00912/pay" });
    expect(done.secondary?.href).toBe("/");
    expect(done.redirectNote).toBe("Kamu akan kembali ke booking dalam 5 detik.");
    await waitFor(() =>
      expect(result.current.kind === "done" && result.current.booking?.title).toBe("Konser A — Jakarta"),
    );
    // Tidak ada redirect otomatis: customer memilih sendiri lewat tombol (desain "You're logged in").
    expect(replace).not.toHaveBeenCalled();
    expect(await container.cradle.getAccountUseCase()).toEqual({
      email: "you@example.com",
      nikMasked: "3171**********22",
    });
  });

  it("link sudah dipakai atau kedaluwarsa: modal Link login gagal dengan tautan minta link baru", async () => {
    window.history.replaceState(null, "", "/login/verify#token=expired");
    const { result } = renderHook(() => useVerifyLoginController(), { wrapper: createWrapper() });
    act(() => result.current.kind === "confirm" && result.current.confirm.onClick());
    await waitFor(() =>
      expect(result.current.kind === "failed" && result.current.dialog?.title).toBe("Link login gagal"),
    );
    const screen = result.current;
    if (screen.kind !== "failed") throw new Error("bukan layar gagal");
    expect(screen.dialog?.primary).toEqual({ label: "Minta link login baru", href: "/login" });
    act(() => screen.dialog?.onDismiss());
    expect(result.current.kind === "failed" && result.current.dialog).toBeUndefined();
  });

  it("link sudah dipakai tetapi perangkat sudah masuk: lanjut tanpa galat", async () => {
    const container = setupTestContainer();
    await container.cradle.verifyLoginUseCase("mt_first");
    window.history.replaceState(null, "", "/login/verify#token=expired");
    const { result } = renderHook(() => useVerifyLoginController(), { wrapper: createWrapper(container) });
    await waitFor(() => expect(result.current.kind).toBe("confirm"));
    act(() => result.current.kind === "confirm" && result.current.confirm.onClick());
    await waitFor(() => expect(result.current.kind).toBe("done"));
    if (result.current.kind !== "done") throw new Error("belum selesai");
    expect(result.current.heading).toBe("Kamu sudah masuk");
    expect(result.current.primary.href).toBe("/");
  });

  it("tanpa token: pesan link tidak lengkap dan tautan minta link baru", () => {
    window.history.replaceState(null, "", "/login/verify");
    const { result } = renderHook(() => useVerifyLoginController(), { wrapper: createWrapper() });
    const screen = result.current;
    if (screen.kind !== "failed") throw new Error("bukan layar gagal");
    expect(screen.message).toBe("Link login tidak lengkap. Minta link baru dari halaman masuk.");
    expect(screen.requestNew.href).toBe("/login");
  });

  it("link ditolak BE: pesan link tidak berlaku, tanpa pindah halaman", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/auth/verify`, () =>
        HttpResponse.json({ meta: { code: 401, message: "Invalid" }, data: {} }, { status: 401 }),
      ),
    );
    window.history.replaceState(null, "", "/login/verify#token=expired");
    const { result } = renderHook(() => useVerifyLoginController(), { wrapper: createWrapper() });
    act(() => result.current.kind === "confirm" && result.current.confirm.onClick());
    await waitFor(() =>
      expect(result.current.kind === "failed" && result.current.message).toBe(
        "Link login tidak berlaku atau sudah dipakai. Minta link baru.",
      ),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  describe("tiba dari link email yang sudah ditukar server (?signedIn=1)", () => {
    const arrive = async (search: string, signedIn = true) => {
      const container = setupTestContainer();
      if (signedIn) await container.cradle.verifyLoginUseCase("mt_arrival");
      window.history.replaceState(null, "", `/login/verify${search}`);
      return renderHook(() => useVerifyLoginController(), { wrapper: createWrapper(container) });
    };

    it("dengan sesi: layar sukses, hitung mundur 5 detik, lalu ke beranda", async () => {
      const { result } = await arrive("?signedIn=1");
      await waitFor(() => expect(result.current.kind).toBe("done"));
      const done = result.current;
      if (done.kind !== "done") throw new Error("belum selesai");
      expect(done.heading).toBe("Kamu sudah masuk");
      expect(done.primary).toEqual({ label: "Jelajahi event", href: "/" });
      expect(done.secondary).toBeUndefined();
      expect(done.redirectNote).toContain("5 detik");
      expect(replace).not.toHaveBeenCalled();
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/"), { timeout: 7000 });
    }, 10000);

    it("next halaman bayar: tombol kembali ke booking dan redirect ke sana", async () => {
      const { result } = await arrive(`?signedIn=1&next=${encodeURIComponent("/orders/RB-1/pay")}`);
      await waitFor(() => expect(result.current.kind).toBe("done"));
      const done = result.current;
      if (done.kind !== "done") throw new Error("belum selesai");
      expect(done.primary).toEqual({ label: "Kembali ke booking", href: "/orders/RB-1/pay" });
      expect(done.secondary?.href).toBe("/");
      expect(done.redirectNote).toBe("Kamu akan kembali ke booking dalam 5 detik.");
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders/RB-1/pay"), { timeout: 7000 });
    }, 10000);

    it("next di luar daftar (//evil.com) diabaikan: tujuan tetap beranda", async () => {
      const { result } = await arrive(`?signedIn=1&next=${encodeURIComponent("//evil.com")}`);
      await waitFor(() => expect(result.current.kind).toBe("done"));
      if (result.current.kind !== "done") throw new Error("belum selesai");
      expect(result.current.primary.href).toBe("/");
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/"), { timeout: 7000 });
      expect(replace).not.toHaveBeenCalledWith("//evil.com");
    }, 10000);

    it("tanpa sesi (URL diketik sendiri): layar gagal, tanpa redirect", async () => {
      const { result } = await arrive("?signedIn=1", false);
      await waitFor(() => expect(result.current.kind).toBe("failed"));
      if (result.current.kind !== "failed") throw new Error("bukan layar gagal");
      expect(result.current.message).toBe("Link login tidak lengkap. Minta link baru dari halaman masuk.");
      expect(replace).not.toHaveBeenCalled();
    });
  });
});
