import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_EVENT_COOKIE,
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
} from "@/core/data/session/access-token.constants";

// API Next (`cookies`, `connection`) hanya hidup di dalam request Next, jadi di test diganti fake tipis.
const setCookie = vi.fn();
const deleteCookie = vi.fn();
/** Cookie yang "dikirim browser" pada request yang sedang dites. */
const sentCookies = new Map<string, string>();
const getCookie = (name: string) =>
  sentCookies.has(name) ? { name, value: sentCookies.get(name) } : undefined;
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: setCookie, delete: deleteCookie, get: getCookie }),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: () => Promise.resolve(),
}));

const gateway = {
  verify: vi.fn(() => new Response("verify")),
  session: vi.fn(() => new Response("session")),
  logout: vi.fn(() => new Response("logout")),
  verifyEmail: vi.fn(() => new Response("verifyEmail")),
  forward: vi.fn(() => new Response("forward")),
  forwardAuth: vi.fn(() => new Response("forwardAuth")),
};
vi.mock("@/di/server-dependencies", () => ({ getServerDependencies: () => ({ accountGateway: gateway }) }));

beforeEach(() => {
  vi.clearAllMocks();
  sentCookies.clear();
});

const json = (body: unknown) =>
  new Request("http://localhost:3000/api/session/start", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/session/start", () => {
  it("umur cookie grant 1080 detik, sama dengan GRANT_TOKEN_TTL_SECONDS di kontrak", () => {
    expect(ACCESS_TOKEN_MAX_AGE_SECONDS).toBe(1080);
  });

  it("menyimpan access token dan event pemiliknya ke cookie httpOnly dan membalas 204", async () => {
    const { POST } = await import("../session/start/route");
    const response = await POST(json({ accessToken: "grant-abc", eventId: "evt_a" }));
    expect(response.status).toBe(204);
    const options = expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    });
    expect(setCookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE, "grant-abc", options);
    expect(setCookie).toHaveBeenCalledWith(ACCESS_EVENT_COOKIE, "evt_a", options);
  });

  it.each([
    ["tanpa token", { eventId: "evt_a" }],
    ["token kosong", { accessToken: "", eventId: "evt_a" }],
    ["token bukan string", { accessToken: 5, eventId: "evt_a" }],
    ["tanpa event", { accessToken: "grant-abc" }],
    ["event kosong", { accessToken: "grant-abc", eventId: "" }],
    ["event bukan string", { accessToken: "grant-abc", eventId: 7 }],
  ])("menolak %s dengan 400 QUEUE_TOKEN_INVALID", async (_name, body) => {
    const { POST } = await import("../session/start/route");
    const response = await POST(json(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "QUEUE_TOKEN_INVALID" });
    expect(setCookie).not.toHaveBeenCalled();
  });

  it("menolak body yang bukan JSON", async () => {
    const { POST } = await import("../session/start/route");
    const response = await POST(
      new Request("http://localhost:3000/api/session/start", { method: "POST", body: "x" }),
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/session/end", () => {
  const end = (body?: unknown) =>
    new Request("http://localhost:3000/api/session/end", {
      method: "POST",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  it("tanpa body: menghapus cookie grant dan event pemiliknya, membalas 204", async () => {
    sentCookies.set(ACCESS_TOKEN_COOKIE, "grant-abc");
    const { POST } = await import("../session/end/route");
    const response = await POST(end());
    expect(response.status).toBe(204);
    expect(deleteCookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
    expect(deleteCookie).toHaveBeenCalledWith(ACCESS_EVENT_COOKIE);
  });

  it("menyebut grant yang masih ada di cookie: cookie dihapus", async () => {
    sentCookies.set(ACCESS_TOKEN_COOKIE, "grant-abc");
    const { POST } = await import("../session/end/route");
    expect((await POST(end({ accessToken: "grant-abc" }))).status).toBe(204);
    expect(deleteCookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
    expect(deleteCookie).toHaveBeenCalledWith(ACCESS_EVENT_COOKIE);
  });

  it("menyebut grant lama padahal cookie sudah berisi grant baru: cookie tidak dihapus", async () => {
    sentCookies.set(ACCESS_TOKEN_COOKIE, "grant-baru");
    const { POST } = await import("../session/end/route");
    expect((await POST(end({ accessToken: "grant-lama" }))).status).toBe(204);
    expect(deleteCookie).not.toHaveBeenCalled();
  });

  it("menyebut grant tetapi cookie sudah tidak ada: catatan event yang tersisa ikut dibersihkan", async () => {
    const { POST } = await import("../session/end/route");
    expect((await POST(end({ accessToken: "grant-lama" }))).status).toBe(204);
    expect(deleteCookie).toHaveBeenCalledWith(ACCESS_EVENT_COOKIE);
  });
});

describe("GET /api/health", () => {
  it("menjawab ok tanpa cache dan tanpa memanggil BE", async () => {
    const { GET } = await import("../health/route");
    const response = await GET();
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("route akun yang meneruskan ke gateway", () => {
  it("auth/verify, auth/session, dan auth/logout memanggil gateway masing-masing", async () => {
    const request = new Request("http://localhost:3000/api/auth/verify", { method: "POST" });
    const verify = await import("../auth/verify/route");
    const session = await import("../auth/session/route");
    const logout = await import("../auth/logout/route");
    const verifyEmail = await import("../auth/verify-email/route");
    expect(await (await verify.POST(request)).text()).toBe("verify");
    expect(gateway.verify).toHaveBeenCalledWith(request);
    expect(await (await session.GET(request)).text()).toBe("session");
    expect(gateway.session).toHaveBeenCalledWith(request);
    expect(await (await logout.POST()).text()).toBe("logout");
    expect(gateway.logout).toHaveBeenCalled();
    expect(await (await verifyEmail.POST(request)).text()).toBe("verifyEmail");
    expect(gateway.verifyEmail).toHaveBeenCalledWith(request);
  });

  it("auth/magic-link, magic-link/resend, dan register meneruskan ke endpoint auth yang sama namanya", async () => {
    const request = new Request("http://localhost:3000/api/auth/x", { method: "POST", body: "{}" });
    const routes = [
      ["magic-link", await import("../auth/magic-link/route")],
      ["magic-link/resend", await import("../auth/magic-link/resend/route")],
      ["register", await import("../auth/register/route")],
    ] as const;
    for (const [path, route] of routes) {
      expect(await (await route.POST(request)).text()).toBe("forwardAuth");
      expect(gateway.forwardAuth).toHaveBeenLastCalledWith(request, path);
    }
  });

  it("account/[...path] menyambung segmen path dan meneruskan request", async () => {
    const route = await import("../account/[...path]/route");
    const request = new Request("http://localhost:3000/api/account/saved-niks/abc", { method: "DELETE" });
    const response = await route.DELETE(request, {
      params: Promise.resolve({ path: ["saved-niks", "abc"] }),
    });
    expect(await response.text()).toBe("forward");
    expect(gateway.forward).toHaveBeenCalledWith(request, "saved-niks/abc");
    expect([route.GET, route.POST].every((handler) => handler === route.DELETE)).toBe(true);
  });
});
