// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { createWrapper, setupMockServer } from "../../__tests__/support";
import { toAuthCallbackViewProps } from "../toAuthCallbackViewProps";
import { useAuthCallbackViewModel } from "../useAuthCallbackViewModel";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

const server = setupMockServer();

describe("useAuthCallbackViewModel", () => {
  it("token ditukar sekali, dihapus dari URL, lalu kembali ke halaman tujuan", async () => {
    replace.mockClear();
    const redeemed = vi.fn();
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/session`, async ({ request }) => {
        redeemed(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    window.history.replaceState(null, "", "/auth/callback?token=tok-1&returnTo=%2Fevents%2Fevt-1%2Fqueue");

    const { result, rerender } = renderHook(() => useAuthCallbackViewModel({ token: "tok-1", returnTo: "/events/evt-1/queue" }), {
      wrapper: createWrapper(),
    });
    expect(window.location.search).toBe("");
    rerender();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/events/evt-1/queue"));
    expect(redeemed).toHaveBeenCalledTimes(1);
    expect(redeemed).toHaveBeenCalledWith({ token: "tok-1" });
    expect(result.current.state.kind).toBe("redeeming");
  });

  it("link tidak berlaku: failed, lalu minta link baru ke login dengan returnTo yang sama", async () => {
    replace.mockClear();
    server.use(http.post(`${MOCK_API_BASE_URL}/auth/session`, () => HttpResponse.json({ code: "LOGIN_LINK_INVALID" }, { status: 410 })));
    const { result } = renderHook(() => useAuthCallbackViewModel({ token: "tok-2", returnTo: "/orders/RB-1/pay" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.state.kind).toBe("failed"));

    const props = toAuthCallbackViewProps(result.current);
    expect(props).toMatchObject({ tone: "error", message: expect.stringContaining("sudah dipakai") });
    props.action?.onClick();
    expect(replace).toHaveBeenCalledWith("/login?returnTo=%2Forders%2FRB-1%2Fpay");
  });

  it("tanpa token: failed tanpa memanggil BE", async () => {
    const redeemed = vi.fn();
    server.use(http.post(`${MOCK_API_BASE_URL}/auth/session`, () => (redeemed(), new HttpResponse(null, { status: 204 }))));
    const { result } = renderHook(() => useAuthCallbackViewModel({ token: null, returnTo: null }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.state).toMatchObject({ kind: "failed", error: { code: "LOGIN_LINK_INVALID" } }));
    expect(redeemed).not.toHaveBeenCalled();
  });
});
