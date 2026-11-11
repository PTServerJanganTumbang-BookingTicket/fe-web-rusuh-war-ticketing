import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { setupMockServer, setupTestContainer, TEST_APP_ORIGIN } from "@/test/support";
import { redirectPathFor } from "../account-gateway.service";

const server = setupMockServer();

const api = (path: string, init: RequestInit = {}) => new Request(`${TEST_APP_ORIGIN}/api${path}`, init);

function cookiesOf(response: Response) {
  return Object.fromEntries(
    response.headers.getSetCookie().map((cookie) => {
      const [pair = ""] = cookie.split("; ");
      const [name = "", ...value] = pair.split("=");
      return [name, { value: decodeURIComponent(value.join("=")), cookie }];
    }),
  );
}

const cookieHeader = (cookies: Record<string, string>) => ({
  cookie: Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; "),
});

async function signIn() {
  const { accountGateway } = setupTestContainer().cradle;
  const response = await accountGateway.verify(
    api("/auth/verify", { method: "POST", body: JSON.stringify({ token: "mt_1" }) }),
  );
  const cookies = cookiesOf(response);
  return {
    accountGateway,
    response,
    cookies,
    session: {
      account_token: cookies.account_token!.value,
      account_refresh: cookies.account_refresh!.value,
      account_profile: cookies.account_profile!.value,
    },
  };
}

describe("redirectPathFor", () => {
  it.each([
    [{ type: "booking", booking_id: "RB-1", event_id: "evt_a" }, "/orders/RB-1/pay"],
    [{ type: "booking", event_id: "evt a" }, "/events/evt%20a/queue"],
    [{ type: "booking" }, "/"],
    [{ type: "https://evil.example" }, "/"],
    [undefined, "/"],
  ])("%o → %s", (context, path) => {
    expect(redirectPathFor(context)).toBe(path);
  });
});

describe("accountGateway.verify", () => {
  it("token akun hanya di cookie httpOnly; body hanya tujuan dan profil", async () => {
    const { response, cookies } = await signIn();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: Record<string, unknown> };
    expect(body.data).toEqual({
      redirect_path: "/orders/RB-00912/pay",
      booking: { event_id: "evt_konser_a", booking_id: "RB-00912" },
      account: { email: "you@example.com", nik_masked: "3171********xx22" },
    });
    expect(JSON.stringify(body)).not.toMatch(/at_|rt_/);
    for (const name of ["account_token", "account_refresh", "account_profile"]) {
      expect(cookies[name]?.cookie).toContain("HttpOnly");
      expect(cookies[name]?.cookie).toContain("SameSite=Lax");
    }
    expect(cookies.account_token?.cookie).toContain("Max-Age=22740");
  });

  it("mengirim token ke BE sebagai cookie magic_token sesuai kontrak", async () => {
    let received: string | null = null;
    server.use(
      http.get(`${MOCK_API_BASE_URL}/auth/verify`, ({ request }) => {
        received = request.headers.get("cookie");
        return HttpResponse.json({ meta: { code: 401, message: "Invalid" }, data: {} }, { status: 401 });
      }),
    );
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.verify(
      api("/auth/verify", { method: "POST", body: JSON.stringify({ token: "a b" }) }),
    );
    expect(received).toBe("magic_token=a%20b");
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("tanpa token: 400 tanpa memanggil BE", async () => {
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.verify(api("/auth/verify", { method: "POST", body: "{}" }));
    expect(response.status).toBe(400);
  });
});

describe("accountGateway.verifyEmail", () => {
  it("mengirim token sebagai cookie magic_token dan query token, tanpa menyetel cookie akun", async () => {
    let seen: { cookie: string | null; query: string | null } | undefined;
    server.use(
      http.get(`${MOCK_API_BASE_URL}/auth/verify-email`, ({ request }) => {
        seen = {
          cookie: request.headers.get("cookie"),
          query: new URL(request.url).searchParams.get("token"),
        };
        return HttpResponse.json({ meta: { code: 200, message: "Email verified" }, data: {} });
      }),
    );
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.verifyEmail(
      api("/auth/verify-email", { method: "POST", body: JSON.stringify({ token: "a b" }) }),
    );
    expect(seen).toEqual({ cookie: "magic_token=a%20b", query: "a b" });
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("token kedaluwarsa dari BE diteruskan apa adanya; tanpa token 400; BE mati 502", async () => {
    const { accountGateway } = setupTestContainer().cradle;
    expect(
      (
        await accountGateway.verifyEmail(
          api("/auth/verify-email", { method: "POST", body: JSON.stringify({ token: "expired" }) }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await accountGateway.verifyEmail(api("/auth/verify-email", { method: "POST", body: "{}" }))).status,
    ).toBe(400);
    server.use(http.get(`${MOCK_API_BASE_URL}/auth/verify-email`, () => HttpResponse.error()));
    expect(
      (
        await accountGateway.verifyEmail(
          api("/auth/verify-email", { method: "POST", body: JSON.stringify({ token: "x" }) }),
        )
      ).status,
    ).toBe(502);
  });
});

describe("accountGateway.forwardAuth", () => {
  const post = (path: string, body: unknown) =>
    api(`/auth/${path}`, { method: "POST", body: JSON.stringify(body) });

  it("meneruskan body ke endpoint auth BE tanpa header Origin dan mengembalikan jawabannya apa adanya", async () => {
    let received: { body: unknown; origin: string | null } | undefined;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/magic-link`, async ({ request }) => {
        received = { body: await request.json(), origin: request.headers.get("origin") };
        return HttpResponse.json(
          { meta: { code: 429, message: "wait" }, data: { retry_after: 60 } },
          { status: 429 },
        );
      }),
    );
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.forwardAuth(post("magic-link", { email: "a@b.co" }), "magic-link");
    expect(received).toEqual({ body: { email: "a@b.co" }, origin: null });
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ data: { retry_after: 60 } });
  });

  it("path di luar daftar izin atau bukan POST dijawab 404 tanpa menyentuh BE", async () => {
    const { accountGateway } = setupTestContainer().cradle;
    expect((await accountGateway.forwardAuth(post("refresh", {}), "refresh")).status).toBe(404);
    expect((await accountGateway.forwardAuth(api("/auth/register"), "register")).status).toBe(404);
  });

  it("BE tidak terjangkau dijawab 502", async () => {
    server.use(http.post(`${MOCK_API_BASE_URL}/auth/register`, () => HttpResponse.error()));
    const { accountGateway } = setupTestContainer().cradle;
    expect((await accountGateway.forwardAuth(post("register", {}), "register")).status).toBe(502);
  });
});

describe("accountGateway.session dan logout", () => {
  it("tamu mendapat account null; sesi mengembalikan profil dari cookie", async () => {
    const { accountGateway, session } = await signIn();
    const guest = (await accountGateway.session(api("/auth/session")).json()) as { data: unknown };
    expect(guest.data).toEqual({ account: null });
    const signedIn = (await accountGateway
      .session(api("/auth/session", { headers: cookieHeader(session) }))
      .json()) as { data: unknown };
    expect(signedIn.data).toEqual({ account: { email: "you@example.com", nik_masked: "3171********xx22" } });
  });

  it("logout mengosongkan ketiga cookie", () => {
    const { accountGateway } = setupTestContainer().cradle;
    const cookies = cookiesOf(accountGateway.logout());
    expect(Object.keys(cookies).sort()).toEqual(["account_profile", "account_refresh", "account_token"]);
    expect(Object.values(cookies).every(({ cookie }) => cookie.includes("Max-Age=0"))).toBe(true);
  });
});

describe("accountGateway.forward", () => {
  it("meneruskan endpoint yang diizinkan dengan Bearer dari cookie", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${MOCK_API_BASE_URL}/accounts/me/saved-niks`, ({ request }) => {
        authorization = request.headers.get("authorization");
        return HttpResponse.json({
          meta: { code: 200, message: "Success" },
          data: { max_entries: 5, saved_niks: [] },
        });
      }),
    );
    const { accountGateway, session } = await signIn();
    const response = await accountGateway.forward(
      api("/account/saved-niks", { headers: cookieHeader(session) }),
      "saved-niks",
    );
    expect(response.status).toBe(200);
    expect(authorization).toBe(`Bearer ${session.account_token}`);
  });

  it("endpoint di luar kontrak (profil, ubah alias) dijawab 404 tanpa menyentuh BE", async () => {
    const { accountGateway, session } = await signIn();
    const headers = cookieHeader(session);
    expect((await accountGateway.forward(api("/account/profile", { headers }), "profile")).status).toBe(404);
    expect(
      (
        await accountGateway.forward(
          api("/account/saved-niks/snk_1", { method: "PATCH", headers, body: "{}" }),
          "saved-niks/snk_1",
        )
      ).status,
    ).toBe(404);
  });

  it("path atau method di luar daftar izin dijawab 404", async () => {
    const { accountGateway, session } = await signIn();
    const headers = cookieHeader(session);
    expect((await accountGateway.forward(api("/account/admin", { headers }), "admin")).status).toBe(404);
    expect(
      (await accountGateway.forward(api("/account/tickets", { method: "DELETE", headers }), "tickets"))
        .status,
    ).toBe(404);
  });

  it("tanpa cookie akun: 401 tanpa memanggil BE", async () => {
    const { accountGateway } = setupTestContainer().cradle;
    expect((await accountGateway.forward(api("/account/tickets"), "tickets")).status).toBe(401);
  });

  it("access token ditolak: refresh sekali, ulangi, dan rotasi cookie", async () => {
    const { accountGateway, session } = await signIn();
    let calls = 0;
    server.use(
      http.get(`${MOCK_API_BASE_URL}/users/me/tickets`, ({ request }) => {
        calls += 1;
        if (request.headers.get("authorization") === `Bearer ${session.account_token}`)
          return HttpResponse.json({ meta: { code: 401, message: "expired" }, data: {} }, { status: 401 });
        return HttpResponse.json({ meta: { code: 200, message: "Success" }, data: [] });
      }),
    );
    const response = await accountGateway.forward(
      api("/account/tickets", { headers: cookieHeader(session) }),
      "tickets",
    );
    expect(response.status).toBe(200);
    expect(calls).toBe(2);
    const rotated = cookiesOf(response);
    expect(rotated.account_token?.value).not.toBe(session.account_token);
    expect(rotated.account_refresh?.value).not.toBe(session.account_refresh);
  });

  it("refresh token yang sudah dipakai: sesi berakhir dan cookie dihapus", async () => {
    const { accountGateway, session } = await signIn();
    const expired = { account_refresh: session.account_refresh };
    await accountGateway.forward(api("/account/tickets", { headers: cookieHeader(expired) }), "tickets");
    const reused = await accountGateway.forward(
      api("/account/tickets", { headers: cookieHeader(expired) }),
      "tickets",
    );
    expect(reused.status).toBe(401);
    expect(cookiesOf(reused).account_token?.cookie).toContain("Max-Age=0");
  });
});
