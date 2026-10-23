import { http, HttpResponse } from "msw";
import type {
  BookingSessionResponseDto,
  EventsResponseDto,
  EmailLinkSentResponseDto,
  LastEmailLinkResponseDto,
  LoginLinkRequestDto,
  MeResponseDto,
  OrderResponseDto,
  PaymentInstructionDto,
  PaymentOutcomeRequestDto,
  QueueResponseDto,
  RedeemLoginLinkRequestDto,
  RegisterRequestDto,
  StartPaymentRequestDto,
  VerificationEmailRequestDto,
  VerifyEmailRequestDto,
} from "@rusuh/api";

export const MOCK_API_BASE_URL = "https://api.rusuh.test";

// Skenario bernama (ADR-0009). Pilih di browser dengan `?scenario=<nama>`.
// `logged-out`: mulai tanpa sesi login. `session-revoked`: sesi dicabut (login di perangkat lain) saat antre (ADR-0010).
const SCENARIOS = ["queue-moving", "queue-stuck", "booking-expiring", "payment-expiring", "logged-out", "session-revoked"] as const;
export type Scenario = (typeof SCENARIOS)[number];
export const DEFAULT_SCENARIO: Scenario = "queue-moving";

export function isScenario(value: string | null | undefined): value is Scenario {
  return SCENARIOS.some((scenario) => scenario === value);
}

const RESEND_COOLDOWN_MS = 30_000;
const account: MeResponseDto = { email: "alex@example.com", maskedNik: "3171••••••••0001", emailVerified: true };

// Body mock diketik dengan DTO dari `@rusuh/api/contracts`: perubahan kontrak membuat mock gagal typecheck (ADR-0017).
const events: EventsResponseDto["events"] = [
  {
    id: "evt-konser-rusuh",
    name: "Konser A — Jakarta",
    venue: "GBK",
    startsAt: "2026-12-25T12:00:00.000Z",
    status: "on_sale",
    minPriceIdr: 500_000,
  },
  {
    id: "evt-konser-b",
    name: "Konser B — Bandung",
    venue: "GOR Saparua",
    startsAt: "2027-01-10T12:00:00.000Z",
    status: "sold_out",
    minPriceIdr: 500_000,
  },
  {
    id: "evt-konser-c",
    name: "Konser C — Surabaya",
    venue: "GOR",
    startsAt: "2027-02-02T12:00:00.000Z",
    status: "on_sale",
    minPriceIdr: 500_000,
  },
];

const eventNameOf = (eventId: string) => events.find((event) => event.id === eventId)?.name ?? events[0]!.name;

type MockOrder = {
  expiresAt: number;
  status: OrderResponseDto["status"];
  method?: OrderResponseDto["method"];
  instruction?: PaymentInstructionDto;
};

const instructionFor = (orderId: string, method: StartPaymentRequestDto["method"]): PaymentInstructionDto => {
  if (method === "virtual_account") return { type: "virtual_account", bank: "BCA", number: "8277081234567890" };
  if (method === "e_wallet") return { type: "qr", payload: `rusuh-pay:${orderId}` };
  return { type: "bank_transfer", bank: "BCA", account: "1234567890", accountName: "PT Rusuh Booking Tiket" };
};

const JOINED_POSITION = 1248;
const POSITIONS_PER_MINUTE = 312;

const categories: BookingSessionResponseDto["categories"] = [
  { id: "vip", name: "VIP", priceIdr: 1_500_000, stock: 12 },
  { id: "festival", name: "Festival", priceIdr: 850_000, stock: 240 },
  { id: "tribune", name: "Tribune", priceIdr: 500_000, stock: 0 },
];

export function createHandlers(scenario: Scenario = DEFAULT_SCENARIO) {
  const pollCount = new Map<string, number>();
  const bookingExpiry = new Map<string, number>();
  const bookingTtlMs = scenario === "booking-expiring" ? 75_000 : 5 * 60_000;
  const paymentTtlMs = scenario === "payment-expiring" ? 45_000 : 10 * 60_000;
  const orders = new Map<string, MockOrder>();

  // Sesi login: di BE asli berupa cookie httpOnly; di mock cukup status di memori.
  let session: "active" | "none" | "revoked" = scenario === "logged-out" ? "none" : "active";
  let tokenCount = 0;
  const lastToken: Record<"login" | "verification", string | undefined> = { login: undefined, verification: undefined };
  const usedTokens = new Set<string>();
  const resendAvailableAt = new Map<string, number>();
  // Akun terdaftar dan status verifikasi email. alex@example.com sudah terdaftar (uji "email sudah terdaftar").
  const accounts = new Map<string, { verified: boolean }>([[account.email, { verified: true }]]);
  const verificationEmailOf = new Map<string, string>();

  /** Jeda kirim ulang per jenis email dan alamat; null bila boleh kirim, atau response 429 dengan Retry-After. */
  const throttle = (key: string) => {
    const now = Date.now();
    const availableAt = resendAvailableAt.get(key) ?? 0;
    if (now < availableAt) {
      const seconds = Math.ceil((availableAt - now) / 1000);
      return HttpResponse.json({ code: "RATE_LIMITED" }, { status: 429, headers: { "retry-after": String(seconds) } });
    }
    resendAvailableAt.set(key, now + RESEND_COOLDOWN_MS);
    return null;
  };

  const linkSent = (email: string, status: number) => {
    const now = Date.now();
    return HttpResponse.json<EmailLinkSentResponseDto>(
      { email, resendAvailableAt: new Date(now + RESEND_COOLDOWN_MS).toISOString(), serverNow: new Date(now).toISOString() },
      { status },
    );
  };

  const issueToken = (kind: "login" | "verification") => {
    tokenCount += 1;
    const token = `mock-${kind}-${tokenCount}`;
    lastToken[kind] = token;
    return token;
  };

  /** Token sekali pakai: valid sekali, lalu ditolak. */
  const consumeToken = (kind: "login" | "verification", token: string) => {
    if (!token.startsWith(`mock-${kind}-`) || usedTokens.has(token)) return false;
    usedTokens.add(token);
    return true;
  };

  /** Endpoint terproteksi menolak tanpa sesi aktif, seperti BE (ADR-0010). */
  const requireSession = () =>
    session === "active"
      ? undefined
      : HttpResponse.json({ code: session === "revoked" ? "SESSION_REVOKED" : "UNAUTHENTICATED" }, { status: 401 });

  const orderFor =(orderId: string): MockOrder => {
    const order = orders.get(orderId) ?? { expiresAt: Date.now() + paymentTtlMs, status: "awaiting_method" as const };
    orders.set(orderId, order);
    // Server yang memutuskan kedaluwarsa (ADR-0005); hanya order yang belum selesai yang bisa expired.
    if ((order.status === "awaiting_method" || order.status === "pending") && Date.now() >= order.expiresAt) order.status = "expired";
    return order;
  };

  const orderBody = (orderId: string, order: MockOrder): OrderResponseDto => ({
    orderId,
    eventName: "Konser A — Jakarta",
    items: [{ name: "VIP", quantity: 1 }],
    totalIdr: 1_500_000,
    expiresAt: new Date(order.expiresAt).toISOString(),
    serverNow: new Date().toISOString(),
    status: order.status,
    method: order.method,
    instruction: order.instruction,
  });

  return [
    http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.json<EventsResponseDto>({ events })),

    http.get(`${MOCK_API_BASE_URL}/events/:eventId/queue`, ({ params }) => {
      const denied = requireSession();
      if (denied) return denied;
      const eventId = String(params.eventId);
      // Login di perangkat lain mencabut sesi ini pada polling ketiga; slot tetap milik akun (ADR-0010).
      if (scenario === "session-revoked" && (pollCount.get(eventId) ?? 0) >= 2) {
        session = "revoked";
        return requireSession();
      }
      orders.clear(); // antrian baru berarti order baru
      bookingExpiry.delete(eventId); // masuk antrian lagi berarti booking berikutnya mendapat TTL baru
      const polls = (pollCount.get(eventId) ?? 0) + 1;
      pollCount.set(eventId, polls);

      const position = scenario === "queue-stuck" ? JOINED_POSITION : Math.max(0, JOINED_POSITION - (polls - 1) * 416);
      if (position === 0) {
        return HttpResponse.json<QueueResponseDto>({
          status: "admitted",
          eventName: eventNameOf(eventId),
          accessToken: "mock-access-token",
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        });
      }
      return HttpResponse.json<QueueResponseDto>({
        status: "waiting",
        eventName: eventNameOf(eventId),
        position,
        joinedPosition: JOINED_POSITION,
        etaSeconds: Math.round((position * 60) / POSITIONS_PER_MINUTE),
        retryAfterSeconds: 2,
      });
    }),

    http.get(`${MOCK_API_BASE_URL}/events/:eventId/booking-session`, ({ params }) => {
      const denied = requireSession();
      if (denied) return denied;
      const eventId = String(params.eventId);
      const now = Date.now();
      const expiresAt = bookingExpiry.get(eventId) ?? now + bookingTtlMs;
      bookingExpiry.set(eventId, expiresAt);

      // Setelah TTL habis server yang memutuskan, bukan klien (ADR-0005).
      if (now >= expiresAt) {
        // Slot dilepas: antrian mulai dari awal agar alur "kembali ke ruang tunggu" bisa diuji ulang.
        // Entri expiry dibiarkan supaya request berikutnya dengan token lama tetap 410, seperti server asli.
        pollCount.delete(eventId);
        return HttpResponse.json({ code: "ACCESS_EXPIRED" }, { status: 410 });
      }

      return HttpResponse.json<BookingSessionResponseDto>({
        eventName: eventNameOf(eventId),
        expiresAt: new Date(expiresAt).toISOString(),
        serverNow: new Date(now).toISOString(),
        maskedNik: "3171••••••••0001",
        quota: { max: 3, used: 0, remaining: 3 },
        categories,
      });
    }),

    http.get(`${MOCK_API_BASE_URL}/orders/:orderId`, ({ params }) => {
      const denied = requireSession();
      if (denied) return denied;
      const order = orderFor(String(params.orderId));
      return HttpResponse.json(orderBody(String(params.orderId), order));
    }),

    http.post(`${MOCK_API_BASE_URL}/orders/:orderId/payment`, async ({ params, request }) => {
      const denied = requireSession();
      if (denied) return denied;
      const orderId = String(params.orderId);
      const order = orderFor(orderId);
      const body = (await request.json().catch(() => null)) as Partial<StartPaymentRequestDto> | null;
      const method = body?.method;
      if (order.status === "awaiting_method" && (method === "virtual_account" || method === "e_wallet" || method === "bank_transfer")) {
        order.status = "pending";
        order.method = method;
        order.instruction = instructionFor(orderId, method);
      }
      return HttpResponse.json(orderBody(orderId, order));
    }),

    // Hanya mock: menggantikan notifikasi Midtrans ke BE.
    http.post(`${MOCK_API_BASE_URL}/mock/orders/:orderId/outcome`, async ({ params, request }) => {
      const orderId = String(params.orderId);
      const order = orderFor(orderId);
      const body = (await request.json().catch(() => null)) as Partial<PaymentOutcomeRequestDto> | null;
      if (order.status === "pending") order.status = body?.outcome === "success" ? "paid" : "failed";
      return HttpResponse.json(orderBody(orderId, order));
    }),

    // Auth passwordless (Figma SJT ZAKI). Respons kirim link sama untuk email apa pun (anti-enumerasi).
    http.post(`${MOCK_API_BASE_URL}/auth/login-link`, async ({ request }) => {
      const body = (await request.json().catch(() => null)) as Partial<LoginLinkRequestDto> | null;
      const email = body?.email ?? "";
      const limited = throttle(`login:${email}`);
      if (limited) return limited;
      issueToken("login");
      return linkSent(email, 202);
    }),

    // Link sekali pakai: token yang sudah dipakai atau tidak dikenal ditolak.
    http.post(`${MOCK_API_BASE_URL}/auth/session`, async ({ request }) => {
      const body = (await request.json().catch(() => null)) as Partial<RedeemLoginLinkRequestDto> | null;
      if (!consumeToken("login", body?.token ?? "")) return HttpResponse.json({ code: "LOGIN_LINK_INVALID" }, { status: 410 });
      session = "active";
      return new HttpResponse(null, { status: 204 });
    }),

    http.delete(`${MOCK_API_BASE_URL}/auth/session`, () => {
      session = "none";
      return new HttpResponse(null, { status: 204 });
    }),

    http.get(`${MOCK_API_BASE_URL}/me`, () => requireSession() ?? HttpResponse.json<MeResponseDto>(account)),

    // Registrasi (Figma SJT ZAKI). Simulasi Dukcapil lewat NIK: akhiran 9999 tidak cocok, akhiran 0000 layanan tidak tersedia.
    http.post(`${MOCK_API_BASE_URL}/auth/register`, async ({ request }) => {
      const body = (await request.json().catch(() => null)) as Partial<RegisterRequestDto> | null;
      const email = body?.email ?? "";
      const nik = body?.nik ?? "";
      if (!/^\d{16}$/.test(nik)) return HttpResponse.json({ code: "NIK_INVALID" }, { status: 422 });
      if (accounts.has(email)) return HttpResponse.json({ code: "EMAIL_ALREADY_REGISTERED" }, { status: 409 });
      if (nik.endsWith("0000")) return HttpResponse.json({ code: "NIK_VERIFICATION_UNAVAILABLE" }, { status: 503 });
      if (nik.endsWith("9999")) return HttpResponse.json({ code: "NIK_MISMATCH" }, { status: 422 });
      accounts.set(email, { verified: false });
      resendAvailableAt.set(`verification:${email}`, Date.now() + RESEND_COOLDOWN_MS);
      verificationEmailOf.set(issueToken("verification"), email);
      return linkSent(email, 201);
    }),

    // Anti-enumerasi: email tidak dikenal tetap mendapat 202 tanpa email terkirim.
    http.post(`${MOCK_API_BASE_URL}/auth/verification-email`, async ({ request }) => {
      const body = (await request.json().catch(() => null)) as Partial<VerificationEmailRequestDto> | null;
      const email = body?.email ?? "";
      const limited = throttle(`verification:${email}`);
      if (limited) return limited;
      if (accounts.get(email)?.verified === false) verificationEmailOf.set(issueToken("verification"), email);
      return linkSent(email, 202);
    }),

    http.post(`${MOCK_API_BASE_URL}/auth/verify-email`, async ({ request }) => {
      const body = (await request.json().catch(() => null)) as Partial<VerifyEmailRequestDto> | null;
      const token = body?.token ?? "";
      const email = verificationEmailOf.get(token);
      if (!email || !consumeToken("verification", token)) return HttpResponse.json({ code: "VERIFICATION_LINK_INVALID" }, { status: 410 });
      accounts.set(email, { verified: true });
      return new HttpResponse(null, { status: 204 });
    }),

    // Hanya mock: pengganti membuka email berisi link login atau verifikasi.
    http.get(`${MOCK_API_BASE_URL}/mock/auth/last-link`, ({ request }) => {
      const kind = new URL(request.url).searchParams.get("kind") === "verification" ? "verification" : "login";
      const token = lastToken[kind];
      return token ? HttpResponse.json<LastEmailLinkResponseDto>({ token }) : HttpResponse.json({ code: "LOGIN_LINK_INVALID" }, { status: 404 });
    }),
  ];
}
