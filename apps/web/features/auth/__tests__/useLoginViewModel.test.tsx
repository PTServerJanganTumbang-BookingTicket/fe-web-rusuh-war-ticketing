// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { createWrapper, setupMockServer } from "../../__tests__/support";
import { useLoginViewModel } from "../useLoginViewModel";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const server = setupMockServer();
const loggedOut = () => server.use(http.get(`${MOCK_API_BASE_URL}/me`, () => HttpResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 })));

function mount(returnTo: string | null = "/events/evt-1/queue", reason: string | null = null) {
  return renderHook(() => useLoginViewModel({ returnTo, reason }), { wrapper: createWrapper() });
}

describe("useLoginViewModel", () => {
  it("sudah login: signedIn; lanjutkan ke halaman tujuan yang aman", async () => {
    push.mockClear();
    const { result } = mount("/events/evt-1/queue");
    expect(result.current.state.kind).toBe("checking");
    await waitFor(() => expect(result.current.state.kind).toBe("signedIn"));
    act(() => result.current.actions.proceed());
    expect(push).toHaveBeenCalledWith("/events/evt-1/queue");
  });

  it("belum login: email salah format tidak dikirim ke BE", async () => {
    loggedOut();
    const sent = vi.fn();
    server.use(http.post(`${MOCK_API_BASE_URL}/auth/login-link`, () => (sent(), HttpResponse.json({}))));
    const { result } = mount(null, "revoked");
    await waitFor(() => expect(result.current.state.kind).toBe("editing"));
    expect(result.current.state).toMatchObject({ reason: "revoked" });

    act(() => result.current.actions.changeEmail("you@"));
    act(() => result.current.actions.submit());
    await waitFor(() => expect(result.current.state).toMatchObject({ kind: "editing", problem: "invalid" }));
    expect(sent).not.toHaveBeenCalled();
  });

  it("kirim link: returnTo ikut ke BE, layar cek inbox dengan jeda kirim ulang", async () => {
    loggedOut();
    const body = vi.fn();
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/login-link`, async ({ request }) => {
        body(await request.json());
        return HttpResponse.json(
          { email: "alex@example.com", resendAvailableAt: new Date(Date.now() + 30_000).toISOString(), serverNow: new Date().toISOString() },
          { status: 202 },
        );
      }),
    );
    const { result } = mount("/events/evt-1/queue");
    await waitFor(() => expect(result.current.state.kind).toBe("editing"));

    act(() => result.current.actions.changeEmail(" alex@example.com "));
    act(() => result.current.actions.submit());
    await waitFor(() => expect(result.current.state.kind).toBe("sent"));
    expect(body).toHaveBeenCalledWith({ email: "alex@example.com", returnTo: "/events/evt-1/queue" });
    const state = result.current.state;
    expect(state.kind === "sent" && state.resendInMs).toBeGreaterThan(25_000);

    act(() => result.current.actions.editEmail());
    await waitFor(() => expect(result.current.state.kind).toBe("editing"));
  });

  it("rate limit: galat RATE_LIMITED dengan retryAfterMs, tetap di form", async () => {
    loggedOut();
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/login-link`, () =>
        HttpResponse.json({ code: "RATE_LIMITED" }, { status: 429, headers: { "retry-after": "20" } }),
      ),
    );
    const { result } = mount();
    await waitFor(() => expect(result.current.state.kind).toBe("editing"));
    act(() => result.current.actions.changeEmail("alex@example.com"));
    act(() => result.current.actions.submit());
    await waitFor(() =>
      expect(result.current.state).toMatchObject({ kind: "editing", error: { code: "RATE_LIMITED", retryAfterMs: 20_000 } }),
    );
  });

  it("keluar: kembali ke form login", async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.state.kind).toBe("signedIn"));
    act(() => result.current.actions.logout());
    await waitFor(() => expect(result.current.state.kind).toBe("editing"));
  });
});
