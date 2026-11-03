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
    await waitFor(() =>
      expect(result.current.kind === "done" && result.current.booking?.title).toBe("Konser A — Jakarta"),
    );
    // Tidak ada redirect otomatis: customer memilih sendiri lewat tombol (desain "You're logged in").
    expect(replace).not.toHaveBeenCalled();
    expect(await container.cradle.getAccountUseCase()).toEqual({
      email: "you@example.com",
      nikMasked: "3171********xx22",
    });
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
});
