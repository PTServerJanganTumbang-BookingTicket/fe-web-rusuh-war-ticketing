// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { createWrapper, setupMockServer } from "../../__tests__/support";
import { useRegisterViewModel } from "../useRegisterViewModel";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const server = setupMockServer();

function mount(step: string | null = null) {
  return renderHook(() => useRegisterViewModel({ step }), { wrapper: createWrapper() });
}

function fill(result: ReturnType<typeof mount>["result"], email: string, nik: string) {
  act(() => result.current.actions.changeEmail(email));
  act(() => result.current.actions.changeNik(nik));
}

describe("useRegisterViewModel", () => {
  it("NIK hanya menerima digit dan maksimal 16", () => {
    const { result } = mount();
    act(() => result.current.actions.changeNik("3171-0000 0000 0001 99"));
    expect(result.current.state).toMatchObject({ kind: "editing", nik: "3171000000000001" });
  });

  it("data tidak valid: galat di field, tanpa dialog dan tanpa memanggil BE", () => {
    const registered = vi.fn();
    server.use(http.post(`${MOCK_API_BASE_URL}/auth/register`, () => (registered(), HttpResponse.json({}))));
    const { result } = mount();
    fill(result, "you@", "123");
    act(() => result.current.actions.submit());
    expect(result.current.state).toMatchObject({ kind: "editing", problems: { email: "invalid", nik: "invalid" } });
    expect(result.current.state.kind === "editing" && result.current.state.dialog).toBeUndefined();
    expect(registered).not.toHaveBeenCalled();
  });

  it("review tidak memanggil BE; konfirmasi mendaftar lalu layar cek email", async () => {
    const body = vi.fn();
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/register`, async ({ request }) => {
        body(await request.json());
        return HttpResponse.json(
          { email: "new@example.com", resendAvailableAt: new Date(Date.now() + 30_000).toISOString(), serverNow: new Date().toISOString() },
          { status: 201 },
        );
      }),
    );
    const { result } = mount();
    fill(result, "new@example.com", "0012345678901234");
    act(() => result.current.actions.submit());
    expect(result.current.state).toMatchObject({ dialog: { kind: "review" } });
    expect(body).not.toHaveBeenCalled();

    act(() => result.current.actions.confirm());
    await waitFor(() => expect(result.current.state.kind).toBe("registered"));
    expect(body).toHaveBeenCalledWith({ email: "new@example.com", nik: "0012345678901234" });
  });

  it("NIK tidak cocok: dialog gagal, ubah data menutup dialog dan data tetap ada", async () => {
    const { result } = mount();
    fill(result, "mismatch@example.com", "3171000000009999");
    act(() => result.current.actions.submit());
    act(() => result.current.actions.confirm());
    await waitFor(() => expect(result.current.state).toMatchObject({ dialog: { kind: "failed", error: { code: "NIK_MISMATCH" } } }));

    act(() => result.current.actions.closeDialog());
    expect(result.current.state).toMatchObject({ kind: "editing", email: "mismatch@example.com", nik: "3171000000009999" });
    expect(result.current.state.kind === "editing" && result.current.state.dialog).toBeUndefined();
  });

  it("mode resend: email saja, lalu layar link terkirim", async () => {
    const { result } = mount("resend");
    act(() => result.current.actions.changeEmail("pending@example.com"));
    act(() => result.current.actions.submit());
    await waitFor(() => expect(result.current.state).toMatchObject({ kind: "registered", mode: "resend" }));
  });
});
