import { z } from "zod";
import { isFullNik, maskNik } from "@/core/domain/nik.utils";
import type { AppConfig } from "@/core/domain/app-config.model";
import type { FetchFn } from "../http/fetch-http.client";
import {
  ACCOUNT_PROFILE_COOKIE,
  ACCOUNT_REFRESH_COOKIE,
  ACCOUNT_TOKEN_COOKIE,
  clearCookie,
  readCookie,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  serializeCookie,
} from "./account-cookies.utils";

/**
 * Lapisan same-origin untuk endpoint yang butuh identitas akun (ADR-0023, opsi 2). Token akun dari BE disimpan
 * di cookie httpOnly; permintaan akun diteruskan ke BE dengan `Authorization: Bearer`. Tidak bergantung pada
 * Next: route di `app/api` hanya memanggil method di sini, jadi alurnya bisa dites dengan `Request` biasa.
 */
export type AccountGateway = {
  /** `POST /api/auth/verify` `{ token }` → `GET /auth/verify` di BE, lalu menyetel cookie akun. */
  verify(request: Request): Promise<Response>;
  /**
   * `GET /auth/login?token=` (link di email) → menukar token lewat cookie `magic_token` ke `GET /auth/verify` di BE,
   * menyetel cookie akun, lalu mengalihkan (303) ke layar sukses `/login/verify?signedIn=1` (tambah
   * `&next=<tujuan>` bila ada booking yang dipulihkan). Layar itu menghitung mundur 5 detik lalu pindah ke tujuan.
   * Gagal: ke `/login/verify` tanpa parameter, yang menjelaskan link tidak berlaku.
   */
  verifyLink(request: Request): Promise<Response>;
  /** `POST /api/auth/verify-email` `{ token }` → `GET /auth/verify-email` di BE (token lewat cookie). Tanpa sesi. */
  verifyEmail(request: Request): Promise<Response>;
  /**
   * `POST /api/auth/<path>` → endpoint auth anonim di BE (minta link, kirim ulang, register). BE menolak permintaan
   * ini bila datang langsung dari browser di origin lain (403), jadi server ini yang meneruskannya.
   */
  forwardAuth(request: Request, path: string): Promise<Response>;
  /** `GET /api/auth/session` → akun dari cookie, atau `null` untuk tamu. */
  session(request: Request): Response;
  /** `POST /api/auth/logout` → menghapus cookie akun. Kontrak belum punya endpoint logout (ADR-0023 usulan 3). */
  logout(): Response;
  /** `/api/account/<path>` → endpoint akun di BE yang ada di daftar izin, dengan refresh sekali bila 401. */
  forward(request: Request, path: string): Promise<Response>;
};

const tokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

const verifySchema = z.object({
  data: tokensSchema.extend({
    user: z.object({ email: z.string(), nik: z.string() }),
    redirect_context: z
      .object({ type: z.string(), event_id: z.string().optional(), booking_id: z.string().optional() })
      .optional(),
  }),
});

type Tokens = z.infer<typeof tokensSchema>;
type RedirectContext = z.infer<typeof verifySchema>["data"]["redirect_context"];

/** Endpoint akun yang boleh diteruskan. Path di luar daftar ini dijawab 404 tanpa menyentuh BE. */
type AccountRoute = {
  pattern: RegExp;
  methods: string[];
  target: (match: RegExpMatchArray) => string;
  /**
   * Endpoint yang juga dipakai tamu: tanpa cookie akun permintaan tetap diteruskan (tanpa Bearer), dan 401 dari BE
   * (grant) dijawab apa adanya. Header grant dan device id dari browser ikut diteruskan.
   */
  guestAllowed?: boolean;
};

/** Header kredensial antrian yang diteruskan apa adanya pada route `guestAllowed`. */
const FORWARDED_HEADERS = ["x-grant-token", "x-device-id", "x-queue-token"];

const ACCOUNT_ROUTES: AccountRoute[] = [
  { pattern: /^saved-niks$/, methods: ["GET", "POST"], target: () => "/accounts/me/saved-niks" },
  {
    pattern: /^saved-niks\/([\w-]+)$/,
    methods: ["DELETE"],
    target: (match) => `/accounts/me/saved-niks/${match[1]}`,
  },
  // Kursi dari profil (`saved_nik_id` / `use_account_nik`) hanya berlaku bila BE melihat token akun (kontrak §4.1, §4.3).
  {
    pattern: /^events\/([\w-]+)\/tickets$/,
    methods: ["GET"],
    target: (match) => `/events/${match[1]}/tickets`,
    guestAllowed: true,
  },
  { pattern: /^bookings$/, methods: ["POST"], target: () => "/bookings", guestAllowed: true },
  // Join antrian, grant (`/queue/me`), dan cek NIK membawa identitas akun supaya tempat antrian terikat ke akun,
  // bukan hanya ke perangkat: keluar akun lalu masuk lagi tidak mengulang antrian dari awal. Tamu tetap sama.
  {
    pattern: /^events\/([\w-]+)\/queue\/join$/,
    methods: ["POST"],
    target: (match) => `/events/${match[1]}/queue/join`,
    guestAllowed: true,
  },
  {
    pattern: /^events\/([\w-]+)\/queue\/me$/,
    methods: ["GET"],
    target: (match) => `/events/${match[1]}/queue/me`,
    guestAllowed: true,
  },
  { pattern: /^nik\/validate$/, methods: ["POST"], target: () => "/nik/validate", guestAllowed: true },
  { pattern: /^tickets$/, methods: ["GET"], target: () => "/users/me/tickets" },
  {
    pattern: /^tickets\/([\w-]+)\/eticket$/,
    methods: ["GET"],
    target: (match) => `/tickets/${match[1]}/eticket`,
  },
];

/** Endpoint auth anonim yang boleh diteruskan; semuanya `POST` dengan body JSON. */
const ANONYMOUS_AUTH_ROUTES = new Set(["magic-link", "magic-link/resend", "register"]);

/**
 * Tujuan setelah login dari `redirect_context` (BR-09). Hanya tipe yang dikenal yang dipakai, dan path dibangun
 * di sini; URL dari response tidak pernah diikuti (ADR-0023 butir 5).
 */
export function redirectPathFor(context: RedirectContext): string {
  if (context?.type !== "booking") return "/";
  if (context.booking_id) return `/orders/${encodeURIComponent(context.booking_id)}/pay`;
  if (context.event_id) return `/events/${encodeURIComponent(context.event_id)}/queue`;
  return "/";
}

function envelope(status: number, message: string, data: unknown = {}, cookies: string[] = []): Response {
  const headers = new Headers({ "content-type": "application/json" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify({ meta: { code: status, message }, data }), { status, headers });
}

export function createAccountGatewayService({
  appConfig,
  fetchFn,
}: {
  appConfig: AppConfig;
  fetchFn: FetchFn;
}): AccountGateway {
  const secure = appConfig.secureCookies;

  const tokenCookies = (tokens: Tokens) => [
    serializeCookie(ACCOUNT_TOKEN_COOKIE, tokens.access_token, { maxAge: tokens.expires_in, secure }),
    serializeCookie(ACCOUNT_REFRESH_COOKIE, tokens.refresh_token, {
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
      secure,
    }),
  ];
  const clearedCookies = () =>
    [ACCOUNT_TOKEN_COOKIE, ACCOUNT_REFRESH_COOKIE, ACCOUNT_PROFILE_COOKIE].map((name) =>
      clearCookie(name, secure),
    );

  async function callBackend(path: string, init: RequestInit): Promise<Response | null> {
    try {
      return await fetchFn(`${appConfig.apiBaseUrl}${path}`, init);
    } catch {
      return null;
    }
  }

  /** Response BE diteruskan apa adanya (status dan envelope), ditambah cookie yang perlu diperbarui. */
  async function passThrough(response: Response, cookies: string[] = []): Promise<Response> {
    const headers = new Headers({
      "content-type": response.headers.get("content-type") ?? "application/json",
    });
    for (const cookie of cookies) headers.append("set-cookie", cookie);
    const body = response.status === 204 ? null : await response.text();
    return new Response(body, { status: response.status, headers });
  }

  async function refresh(refreshToken: string): Promise<Tokens | null> {
    const response = await callBackend("/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response?.ok) return null;
    const parsed = z.object({ data: tokensSchema }).safeParse(await response.json().catch(() => undefined));
    return parsed.success ? parsed.data.data : null;
  }

  type Redeemed =
    | {
        ok: true;
        redirectPath: string;
        booking: { event_id?: string; booking_id?: string } | null;
        account: { email: string; nik_masked: string; nik?: string };
        cookies: string[];
      }
    | { ok: false; response: Response };

  /** Menukar token magic link dengan sesi akun. Kontrak membaca `magic_token` dari cookie (ADR-0023 usulan 1). */
  async function redeem(token: string): Promise<Redeemed> {
    const response = await callBackend("/auth/verify", {
      headers: { cookie: `magic_token=${encodeURIComponent(token)}` },
    });
    if (!response) return { ok: false, response: envelope(502, "Backend unavailable") };
    if (!response.ok) return { ok: false, response: await passThrough(response) };

    const parsed = verifySchema.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success) return { ok: false, response: envelope(502, "Unexpected verify response") };
    const { user, redirect_context: context } = parsed.data.data;
    // BE mengirim NIK lengkap (asumsi, lihat contract-assumptions.md). Bentuk tersamar dari BE lama tetap diterima apa adanya.
    const account = isFullNik(user.nik)
      ? { email: user.email, nik_masked: maskNik(user.nik), nik: user.nik }
      : { email: user.email, nik_masked: user.nik };
    const booking =
      context?.type === "booking" ? { event_id: context.event_id, booking_id: context.booking_id } : null;
    return {
      ok: true,
      redirectPath: redirectPathFor(context),
      booking,
      account,
      cookies: [
        ...tokenCookies(parsed.data.data),
        serializeCookie(ACCOUNT_PROFILE_COOKIE, JSON.stringify(account), {
          maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
          secure,
        }),
      ],
    };
  }

  return {
    async verify(request) {
      const body: unknown = await request.json().catch(() => undefined);
      const token = typeof body === "object" && body !== null && "token" in body ? body.token : undefined;
      if (typeof token !== "string" || token === "") return envelope(400, "token is required");

      const result = await redeem(token);
      if (!result.ok) return result.response;
      const { redirectPath, booking, account, cookies } = result;
      return envelope(200, "Login successful", { redirect_path: redirectPath, booking, account }, cookies);
    },

    async verifyLink(request) {
      const url = new URL(request.url);
      const token = url.searchParams.get("token");
      const redirect = (path: string, cookies: string[] = []) => {
        const headers = new Headers({
          location: new URL(path, url).toString(),
          // Jangan di-cache dan jangan bocor lewat Referer ke halaman berikutnya.
          "cache-control": "no-store",
          "referrer-policy": "no-referrer",
        });
        for (const cookie of cookies) headers.append("set-cookie", cookie);
        return new Response(null, { status: 303, headers });
      };
      if (!token) return redirect("/login/verify");
      const result = await redeem(token);
      // Token ditolak BE (4xx: sudah dipakai atau kedaluwarsa) berbeda dari BE yang tidak menjawab; halaman tujuan
      // memberi pesan yang sesuai, bukan "link tidak lengkap".
      if (!result.ok)
        return redirect(`/login/verify?error=${result.response.status < 500 ? "invalid" : "unavailable"}`);
      const next = result.redirectPath === "/" ? "" : `&next=${encodeURIComponent(result.redirectPath)}`;
      return redirect(`/login/verify?signedIn=1${next}`, result.cookies);
    },

    async verifyEmail(request) {
      const body: unknown = await request.json().catch(() => undefined);
      const token = typeof body === "object" && body !== null && "token" in body ? body.token : undefined;
      if (typeof token !== "string" || token === "") return envelope(400, "token is required");

      // Token lewat cookie `magic_token`, bukan query parameter (kontrak §1.7, v2.24), supaya tidak masuk log akses.
      const response = await callBackend("/auth/verify-email", {
        headers: { cookie: `magic_token=${encodeURIComponent(token)}` },
      });
      if (!response) return envelope(502, "Backend unavailable");
      return passThrough(response);
    },

    async forwardAuth(request, path) {
      if (request.method !== "POST" || !ANONYMOUS_AUTH_ROUTES.has(path)) return envelope(404, "Not found");
      const response = await callBackend(`/auth/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: await request.text(),
      });
      if (!response) return envelope(502, "Backend unavailable");
      return passThrough(response);
    },

    session(request) {
      const profile = readCookie(request, ACCOUNT_PROFILE_COOKIE);
      const signedIn = Boolean(
        readCookie(request, ACCOUNT_TOKEN_COOKIE) ?? readCookie(request, ACCOUNT_REFRESH_COOKIE),
      );
      if (!profile || !signedIn) return envelope(200, "Success", { account: null });
      try {
        return envelope(200, "Success", { account: JSON.parse(profile) as unknown });
      } catch {
        return envelope(200, "Success", { account: null }, clearedCookies());
      }
    },

    logout() {
      return envelope(200, "Signed out", {}, clearedCookies());
    },

    async forward(request, path) {
      const route = ACCOUNT_ROUTES.map((item) => ({ item, match: path.match(item.pattern) })).find(
        ({ item, match }) => match && item.methods.includes(request.method),
      );
      if (!route?.match) return envelope(404, "Not found");

      const target = `${route.item.target(route.match)}${new URL(request.url).search}`;
      const body = ["POST", "PATCH"].includes(request.method) ? await request.text() : undefined;
      const guestAllowed = route.item.guestAllowed === true;
      const credentialHeaders: Record<string, string> = {};
      for (const name of FORWARDED_HEADERS) {
        const value = guestAllowed ? request.headers.get(name) : null;
        if (value) credentialHeaders[name] = value;
      }
      const send = (accessToken?: string) =>
        callBackend(target, {
          method: request.method,
          headers: {
            ...credentialHeaders,
            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
            ...(body ? { "content-type": "application/json" } : {}),
          },
          body,
        });

      const accessToken = readCookie(request, ACCOUNT_TOKEN_COOKIE);
      const refreshToken = readCookie(request, ACCOUNT_REFRESH_COOKIE);
      if (!accessToken && !refreshToken) {
        if (!guestAllowed) return envelope(401, "Login required");
        const guest = await send();
        return guest ? passThrough(guest) : envelope(502, "Backend unavailable");
      }

      const first = accessToken ? await send(accessToken) : null;
      if (first && first.status !== 401) return passThrough(first);
      if (accessToken && !first) return envelope(502, "Backend unavailable");

      // Access token habis atau tidak ada: refresh sekali (rotasi), lalu ulangi permintaan.
      const tokens = refreshToken ? await refresh(refreshToken) : null;
      // Pada route tamu, 401 bisa berasal dari grant, bukan sesi akun: jawaban BE diteruskan, cookie tidak dihapus.
      if (!tokens && guestAllowed && first) return passThrough(first);
      if (!tokens) return envelope(401, "Session ended; please sign in again", {}, clearedCookies());
      const retried = await send(tokens.access_token);
      if (!retried) return envelope(502, "Backend unavailable");
      return passThrough(retried, tokenCookies(tokens));
    },
  };
}
