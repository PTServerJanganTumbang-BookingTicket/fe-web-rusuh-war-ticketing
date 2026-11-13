import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { setupMockServer, setupTestContainer, TEST_APP_ORIGIN } from "@/test/support";
import { readCookie } from "../account-cookies.utils";
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
      account: { email: "you@example.com", nik_masked: "3171**********22", nik: "3171000000000022" },
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

describe("accountGateway.verifyLink", () => {
  const link = (search: string) => new Request(`${TEST_APP_ORIGIN}/auth/login${search}`);

  it("menukar token lewat cookie magic_token, menyetel cookie akun, dan langsung mengalihkan", async () => {
    let received: string | null = null;
    server.use(
      http.get(`${MOCK_API_BASE_URL}/auth/verify`, ({ request }) => {
        received = request.headers.get("cookie");
        return HttpResponse.json({
          meta: { code: 200, message: "Login successful" },
          data: {
            access_token: "at_1",
            refresh_token: "rt_1",
            expires_in: 22740,
            user: { id: "usr_1", email: "you@example.com", nik: "3171********xx22" },
          },
        });
      }),
    );
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.verifyLink(link("?token=a%20b"));
    expect(received).toBe("magic_token=a%20b");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${TEST_APP_ORIGIN}/login/verify?signedIn=1`);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const cookies = cookiesOf(response);
    expect(Object.keys(cookies).sort()).toEqual(["account_profile", "account_refresh", "account_token"]);
    expect(cookies.account_token?.cookie).toContain("HttpOnly");
  });

  it("booking aktif dari redirect_context dibawa lewat parameter next ke layar sukses", async () => {
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.verifyLink(link("?token=mt_1"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `${TEST_APP_ORIGIN}/login/verify?signedIn=1&next=${encodeURIComponent("/orders/RB-00912/pay")}`,
    );
  });

  it("NIK lengkap dari BE disimpan di profil beserta bentuk tersamarnya", async () => {
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.verifyLink(link("?token=mt_1"));
    expect(JSON.parse(cookiesOf(response).account_profile!.value)).toEqual({
      email: "you@example.com",
      nik_masked: "3171**********22",
      nik: "3171000000000022",
    });
  });

  it("NIK tersamar dari BE dipakai apa adanya tanpa field nik", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/auth/verify`, () =>
        HttpResponse.json({
          meta: { code: 200, message: "Login successful" },
          data: {
            access_token: "at_1",
            refresh_token: "rt_1",
            expires_in: 22740,
            user: { id: "usr_1", email: "you@example.com", nik: "3171********xx22" },
          },
        }),
      ),
    );
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.verifyLink(link("?token=mt_1"));
    expect(JSON.parse(cookiesOf(response).account_profile!.value)).toEqual({
      email: "you@example.com",
      nik_masked: "3171********xx22",
    });
  });

  it("token ditolak BE: tanpa cookie, ke /login/verify?error=invalid", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/auth/verify`, () =>
        HttpResponse.json({ meta: { code: 401, message: "Invalid" }, data: {} }, { status: 401 }),
      ),
    );
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.verifyLink(link("?token=expired"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${TEST_APP_ORIGIN}/login/verify?error=invalid`);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("tanpa token: ke /login/verify tanpa memanggil BE", async () => {
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.verifyLink(link(""));
    expect(response.headers.get("location")).toBe(`${TEST_APP_ORIGIN}/login/verify`);
  });

  it("BE tidak terjangkau: ke /login/verify?error=unavailable", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/auth/verify`, () => HttpResponse.error()));
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.verifyLink(link("?token=x"));
    expect(response.headers.get("location")).toBe(`${TEST_APP_ORIGIN}/login/verify?error=unavailable`);
  });
});

describe("accountGateway.verifyEmail", () => {
  it("mengirim token sebagai cookie magic_token tanpa query token, tanpa menyetel cookie akun", async () => {
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
    expect(seen).toEqual({ cookie: "magic_token=a%20b", query: null });
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
    expect(signedIn.data).toEqual({
      account: { email: "you@example.com", nik_masked: "3171**********22", nik: "3171000000000022" },
    });
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

describe("accountGateway.forward: kegagalan refresh", () => {
  const expiredTickets = () =>
    http.get(`${MOCK_API_BASE_URL}/users/me/tickets`, () =>
      HttpResponse.json({ meta: { code: 401, message: "expired" }, data: {} }, { status: 401 }),
    );

  it.each([
    ["5xx", () => HttpResponse.json({}, { status: 503 })],
    ["body rusak", () => HttpResponse.json({ oops: true })],
    ["jaringan putus", () => HttpResponse.error()],
  ])("refresh gagal sementara (%s): 502 dan cookie tidak dihapus", async (_name, resolver) => {
    const { accountGateway, session } = await signIn();
    server.use(expiredTickets(), http.post(`${MOCK_API_BASE_URL}/auth/refresh`, resolver));
    const response = await accountGateway.forward(
      api("/account/tickets", { headers: cookieHeader(session) }),
      "tickets",
    );
    expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("refresh ditolak 400: sesi berakhir dan cookie dihapus", async () => {
    const { accountGateway, session } = await signIn();
    server.use(
      expiredTickets(),
      http.post(`${MOCK_API_BASE_URL}/auth/refresh`, () => HttpResponse.json({}, { status: 400 })),
    );
    const response = await accountGateway.forward(
      api("/account/tickets", { headers: cookieHeader(session) }),
      "tickets",
    );
    expect(response.status).toBe(401);
    expect(cookiesOf(response).account_refresh?.cookie).toContain("Max-Age=0");
  });

  it("permintaan paralel berbagi satu refresh dan semuanya mendapat cookie baru", async () => {
    const { accountGateway, session } = await signIn();
    let refreshCalls = 0;
    server.use(
      http.get(`${MOCK_API_BASE_URL}/users/me/tickets`, ({ request }) =>
        request.headers.get("authorization") === `Bearer ${session.account_token}`
          ? HttpResponse.json({ meta: { code: 401, message: "expired" }, data: {} }, { status: 401 })
          : HttpResponse.json({ meta: { code: 200, message: "Success" }, data: [] }),
      ),
      http.post(`${MOCK_API_BASE_URL}/auth/refresh`, async () => {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return HttpResponse.json({
          meta: { code: 200, message: "Success" },
          data: { access_token: "at_new", refresh_token: "rt_new", expires_in: 60 },
        });
      }),
    );
    const call = () =>
      accountGateway.forward(api("/account/tickets", { headers: cookieHeader(session) }), "tickets");
    const responses = await Promise.all([call(), call(), call()]);
    expect(refreshCalls).toBe(1);
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(cookiesOf(response).account_refresh?.value).toBe("rt_new");
    }
  });
});

describe("readCookie", () => {
  it("cookie dengan percent-encoding rusak dianggap tidak ada", () => {
    const request = new Request(TEST_APP_ORIGIN, { headers: { cookie: "a=%E0%A4%A; b=ok%20x" } });
    expect(readCookie(request, "a")).toBeUndefined();
    expect(readCookie(request, "b")).toBe("ok x");
  });
});

describe("accountGateway.forward: route yang juga dipakai tamu", () => {
  const credentials = { "x-grant-token": "grant_1", "x-device-id": "dev_1" };
  const captureTickets = () => {
    const seen: { authorization: string | null; grant: string | null; device: string | null }[] = [];
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/evt_a/tickets`, ({ request }) => {
        seen.push({
          authorization: request.headers.get("authorization"),
          grant: request.headers.get("x-grant-token"),
          device: request.headers.get("x-device-id"),
        });
        return HttpResponse.json({ meta: { code: 200, message: "Success" }, data: {} });
      }),
    );
    return seen;
  };

  it("customer login: Bearer dari cookie dan header grant sama-sama sampai ke BE", async () => {
    const seen = captureTickets();
    const { accountGateway, session } = await signIn();
    const response = await accountGateway.forward(
      api("/account/events/evt_a/tickets", { headers: { ...cookieHeader(session), ...credentials } }),
      "events/evt_a/tickets",
    );
    expect(response.status).toBe(200);
    expect(seen).toEqual([
      { authorization: `Bearer ${session.account_token}`, grant: "grant_1", device: "dev_1" },
    ]);
  });

  it("tamu: tetap diteruskan tanpa Bearer, dengan header grant", async () => {
    const seen = captureTickets();
    const { accountGateway } = setupTestContainer().cradle;
    const response = await accountGateway.forward(
      api("/account/events/evt_a/tickets", { headers: credentials }),
      "events/evt_a/tickets",
    );
    expect(response.status).toBe(200);
    expect(seen).toEqual([{ authorization: null, grant: "grant_1", device: "dev_1" }]);
  });

  it("POST /bookings diteruskan dengan body, Bearer, dan header grant", async () => {
    let received: { authorization: string | null; grant: string | null; body: unknown } | undefined;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/bookings`, async ({ request }) => {
        received = {
          authorization: request.headers.get("authorization"),
          grant: request.headers.get("x-grant-token"),
          body: await request.json(),
        };
        return HttpResponse.json({ meta: { code: 201, message: "Created" }, data: {} }, { status: 201 });
      }),
    );
    const { accountGateway, session } = await signIn();
    const body = { event_id: "evt_a", tickets: [{ category_id: "cat_vip", use_account_nik: true }] };
    const response = await accountGateway.forward(
      api("/account/bookings", {
        method: "POST",
        headers: { ...cookieHeader(session), ...credentials },
        body: JSON.stringify(body),
      }),
      "bookings",
    );
    expect(response.status).toBe(201);
    expect(received).toEqual({ authorization: `Bearer ${session.account_token}`, grant: "grant_1", body });
  });

  it("401 dari grant: jawaban BE diteruskan apa adanya dan cookie akun tidak dihapus", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/evt_a/tickets`, () =>
        HttpResponse.json({ meta: { code: 401, message: "Grant expired" } }, { status: 401 }),
      ),
      http.post(`${MOCK_API_BASE_URL}/auth/refresh`, () =>
        HttpResponse.json({ meta: { code: 401, message: "no" } }, { status: 401 }),
      ),
    );
    const { accountGateway, session } = await signIn();
    const response = await accountGateway.forward(
      api("/account/events/evt_a/tickets", { headers: { ...cookieHeader(session), ...credentials } }),
      "events/evt_a/tickets",
    );
    expect(response.status).toBe(401);
    expect(((await response.json()) as { meta: { message: string } }).meta.message).toBe("Grant expired");
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("header kredensial tidak diteruskan pada route akun biasa", async () => {
    let grant: string | null = "belum";
    server.use(
      http.get(`${MOCK_API_BASE_URL}/accounts/me/saved-niks`, ({ request }) => {
        grant = request.headers.get("x-grant-token");
        return HttpResponse.json({
          meta: { code: 200, message: "Success" },
          data: { max_entries: 5, saved_niks: [] },
        });
      }),
    );
    const { accountGateway, session } = await signIn();
    await accountGateway.forward(
      api("/account/saved-niks", { headers: { ...cookieHeader(session), ...credentials } }),
      "saved-niks",
    );
    expect(grant).toBeNull();
  });
});
