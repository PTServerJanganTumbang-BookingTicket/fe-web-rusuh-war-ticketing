// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { createWrapper, setupMockServer } from "../../__tests__/support";
import { toVerifyEmailViewProps } from "../toVerifyEmailViewProps";
import { useVerifyEmailViewModel } from "../useVerifyEmailViewModel";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

const server = setupMockServer();

describe("useVerifyEmailViewModel", () => {
  it("token ditukar sekali dan dihapus dari URL; berhasil mengarah ke login", async () => {
    replace.mockClear();
    const verified = vi.fn();
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/verify-email`, async ({ request }) => {
        verified(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    window.history.replaceState(null, "", "/auth/verify-email?token=tok-v");
    const { result } = renderHook(() => useVerifyEmailViewModel({ token: "tok-v" }), { wrapper: createWrapper() });
    expect(window.location.search).toBe("");
    await waitFor(() => expect(result.current.state.kind).toBe("verified"));
    expect(verified).toHaveBeenCalledTimes(1);

    toVerifyEmailViewProps(result.current).action?.onClick();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("link tidak berlaku: gagal, lalu minta email verifikasi baru", async () => {
    replace.mockClear();
    const { result } = renderHook(() => useVerifyEmailViewModel({ token: "mock-verification-unknown" }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.state).toMatchObject({ kind: "failed", error: { code: "VERIFICATION_LINK_INVALID" } }));

    const props = toVerifyEmailViewProps(result.current);
    expect(props).toMatchObject({ tone: "error", title: "Verifikasi email gagal" });
    props.action?.onClick();
    expect(replace).toHaveBeenCalledWith("/register?step=resend");
  });
});
