// Handler MSW dibandingkan dengan contoh response di openapi.json: setiap field contoh harus ada dengan tipe JSON yang sama.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { createHandlers, MOCK_API_BASE_URL, type Scenario } from "../handlers";
import { FAILING_CAPTCHA_TOKEN } from "../api/events";

type Operation = {
  operationId: string;
  responses: Record<
    string,
    { content?: Record<string, { example?: unknown; examples?: Record<string, { value: unknown }> }> }
  >;
};

const spec = JSON.parse(readFileSync(path.resolve("src/core/data/http/openapi.json"), "utf8")) as {
  paths: Record<string, Record<string, Operation>>;
};
const operations = new Map(
  Object.values(spec.paths).flatMap((methods) =>
    Object.values(methods).map((op) => [op.operationId, op] as const),
  ),
);

function exampleOf(operationId: string, status: number, name?: string): unknown {
  const content = operations.get(operationId)?.responses[String(status)]?.content?.["application/json"];
  if (!content) throw new Error(`${operationId} ${status} tidak punya contoh JSON`);
  if (name) return content.examples?.[name]?.value;
  return content.example ?? Object.values(content.examples ?? {})[0]?.value;
}

function jsonType(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

/** Daftar path field contoh yang hilang atau berbeda tipe di response. */
function shapeMismatches(example: unknown, actual: unknown, at = "$"): string[] {
  if (example === null) return [];
  if (jsonType(example) !== jsonType(actual)) return [`${at}: ${jsonType(example)} != ${jsonType(actual)}`];
  if (Array.isArray(example) && Array.isArray(actual)) {
    if (example.length === 0 || actual.length === 0) return [];
    return shapeMismatches(example[0], actual[0], `${at}[0]`);
  }
  if (typeof example === "object" && typeof actual === "object" && actual !== null) {
    return Object.entries(example).flatMap(([key, value]) =>
      key in actual
        ? shapeMismatches(value, (actual as Record<string, unknown>)[key], `${at}.${key}`)
        : [`${at}.${key}: hilang`],
    );
  }
  return [];
}

async function expectContract<Data = Record<string, unknown>>(
  response: Response,
  operationId: string,
  status: number,
  exampleName?: string,
) {
  expect(response.status).toBe(status);
  const body: unknown = await response.json();
  expect(shapeMismatches(exampleOf(operationId, status, exampleName), body)).toEqual([]);
  return body as { meta: { code: number; message: string }; data: Data };
}

const CAPTCHA = { captcha_token: "test-captcha-token" };
const DEVICE = { "x-device-id": "d3f1a9c4b70e42f88a1c5e6072b9d4af" };
const BEARER = { authorization: "Bearer at_test" };
const api = (pathname: string, init: RequestInit = {}) => fetch(`${MOCK_API_BASE_URL}${pathname}`, init);
const post = (pathname: string, body: unknown, headers: Record<string, string> = {}) =>
  api(pathname, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

function useServer(scenario?: Scenario) {
  const server = setupServer(...createHandlers(scenario));
  beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
  afterEach(() => vi.useRealTimers());
  afterAll(() => server.close());
}

/** Join antrian; token dari Set-Cookie dikirim ulang lewat X-Queue-Token seperti klien mobile. */
async function joinQueue(eventId = "evt_konser_a") {
  const joined = await post(`/events/${eventId}/queue/join`, CAPTCHA, DEVICE);
  const token = /queue_token=([^;]+)/.exec(joined.headers.get("set-cookie") ?? "")?.[1] ?? "";
  return { "x-queue-token": token };
}

/** Join lalu poll /queue/me sampai GRANTED, seperti klien setelah event `grant`. */
async function obtainGrant(eventId = "evt_konser_a") {
  const queue = await joinQueue(eventId);
  for (let poll = 0; poll < 10; poll += 1) {
    const { data } = (await (await api(`/events/${eventId}/queue/me`, { headers: queue })).json()) as {
      data: { state: string; grant_token?: string };
    };
    if (data.grant_token) return { "x-grant-token": data.grant_token, ...DEVICE };
  }
  throw new Error("grant tidak pernah diberikan");
}

const bookingRequest = (niks: string[], categoryId = "cat_vip") => ({
  event_id: "evt_konser_a",
  tickets: niks.map((nik) => ({ category_id: categoryId, nik, holder_email: "buyer@example.com" })),
  contact_email: "buyer@example.com",
  terms_version: "2026-10-01",
});

describe("Authentication dan Accounts", () => {
  useServer();

  it("requestMagicLink 200 lalu 429 saat diminta ulang", async () => {
    await expectContract(
      await post("/auth/magic-link", { email: "you@example.com" }),
      "requestMagicLink",
      200,
    );
    const limited = await expectContract(
      await post("/auth/magic-link", { email: "you@example.com" }),
      "requestMagicLink",
      429,
    );
    expect(limited.data.retry_after).toBeGreaterThan(0);
  });

  it("resendMagicLink 200", async () => {
    await expectContract(
      await post("/auth/magic-link/resend", { email: "you@example.com" }),
      "resendMagicLink",
      200,
    );
  });

  it("verifyMagicLink butuh cookie magic_token", async () => {
    expect((await api("/auth/verify")).status).toBe(401);
    await expectContract(
      await api("/auth/verify", { headers: { cookie: "magic_token=mt_1" } }),
      "verifyMagicLink",
      200,
    );
  });

  it("refreshSession merotasi token dan menolak pemakaian ulang", async () => {
    const verified = (await (
      await api("/auth/verify", { headers: { cookie: "magic_token=mt_2" } })
    ).json()) as {
      data: { refresh_token: string };
    };
    const first = await post("/auth/refresh", { refresh_token: verified.data.refresh_token });
    await expectContract(first, "refreshSession", 200);
    await expectContract(
      await post("/auth/refresh", { refresh_token: verified.data.refresh_token }),
      "refreshSession",
      401,
    );
    expect((await post("/auth/refresh", {})).status).toBe(400);
  });

  it("registerAccount: sukses, NIK salah, consent, dan NIK terdaftar", async () => {
    const consent = { accepted: true, policy_version: "2026-10-01" };
    await expectContract(
      await post("/auth/register", { email: "alex@example.com", nik: "3171000000000044", consent }),
      "registerAccount",
      200,
    );
    await expectContract(
      await post("/auth/register", { email: "alex@example.com", nik: "123", consent }),
      "registerAccount",
      400,
    );
    expect(
      (await post("/auth/register", { email: "alex@example.com", nik: "3171000000000044", consent: {} }))
        .status,
    ).toBe(422);
    await expectContract(
      await post("/auth/register", { email: "alex@example.com", nik: "3171000000000022", consent }),
      "registerAccount",
      409,
    );
  });

  it("saved NIK: butuh Bearer, tambah, tolak duplikat, hapus", async () => {
    expect((await api("/accounts/me/saved-niks")).status).toBe(401);
    await expectContract(await api("/accounts/me/saved-niks", { headers: BEARER }), "listSavedNiks", 200);
    const created = await post("/accounts/me/saved-niks", { nik: "3171000000000044", label: "Budi" }, BEARER);
    expect(created.status).toBe(201);
    const { data } = (await created.json()) as { data: { id: string } };
    expect(
      (await post("/accounts/me/saved-niks", { nik: "3171000000000044", label: "Lagi" }, BEARER)).status,
    ).toBe(409);
    expect(
      (await api(`/accounts/me/saved-niks/${data.id}`, { method: "DELETE", headers: BEARER })).status,
    ).toBe(204);
  });
});

describe("Events dan Queue", () => {
  useServer();

  it("listEvents dengan filter dan pagination", async () => {
    const all = await expectContract(await api("/events"), "listEvents", 200);
    expect(all.data).toHaveLength(3);
    const upcoming = await expectContract<{ id: string }[]>(
      await api("/events?filter=upcoming&limit=1"),
      "listEvents",
      200,
    );
    expect(upcoming.data.map((event) => event.id)).toEqual(["evt_konser_c"]);
  });

  it("getEvent 200 dan 404", async () => {
    await expectContract(await api("/events/evt_konser_a"), "getEvent", 200);
    expect((await api("/events/evt_tidak_ada")).status).toBe(404);
  });

  it("joinQueue: tamu tanpa X-Device-Id ditolak, antrian penuh 503", async () => {
    expect((await post("/events/evt_konser_a/queue/join", CAPTCHA)).status).toBe(400);
    await expectContract(await post("/events/evt_konser_b/queue/join", CAPTCHA, DEVICE), "joinQueue", 503);
    const joined = await post("/events/evt_konser_a/queue/join", CAPTCHA, DEVICE);
    expect(joined.headers.get("set-cookie")).toContain("queue_token=");
    await expectContract(joined, "joinQueue", 200, "1");
    const rejoined = await post("/events/evt_konser_a/queue/join", CAPTCHA, {
      ...DEVICE,
      cookie: `queue_token=${/queue_token=([^;]+)/.exec(joined.headers.get("set-cookie") ?? "")?.[1] ?? ""}`,
    });
    expect(rejoined.status).toBe(200);
  });

  it("joinQueue: tanpa captcha_token 400 CAPTCHA_REQUIRED, token ditolak 403 CAPTCHA_FAILED", async () => {
    const missing = await expectContract(
      await post("/events/evt_konser_a/queue/join", {}, DEVICE),
      "joinQueue",
      400,
      "4",
    );
    expect(missing.meta).toMatchObject({ error_code: "CAPTCHA_REQUIRED" });
    const rejected = await expectContract(
      await post("/events/evt_konser_a/queue/join", { captcha_token: FAILING_CAPTCHA_TOKEN }, DEVICE),
      "joinQueue",
      403,
    );
    expect(rejected.meta).toMatchObject({ error_code: "CAPTCHA_FAILED" });
  });

  it("getQueueMe: 401 tanpa token, QUEUED lalu GRANTED", async () => {
    expect((await api("/events/evt_konser_c/queue/me")).status).toBe(401);
    const headers = await joinQueue();
    await expectContract(await api("/events/evt_konser_a/queue/me", { headers }), "getQueueMe", 200, "1");
    await api("/events/evt_konser_a/queue/me", { headers });
    await expectContract(await api("/events/evt_konser_a/queue/me", { headers }), "getQueueMe", 200, "2");
  });

  it("getEvent membawa konfigurasi captcha untuk join antrian", async () => {
    const event = (await (await api("/events/evt_konser_a")).json()) as {
      data: { captcha: { provider: string; site_key: string } };
    };
    expect(event.data.captcha).toMatchObject({ provider: "turnstile" });
  });

  it("getNowServing", async () => {
    await expectContract(await api("/events/evt_konser_a/queue/serving"), "getNowServing", 200);
  });
});

describe("Booking, NIK, Payment, dan tiket", () => {
  useServer();
  let grant: Record<string, string>;
  let bookingId: string;

  beforeAll(async () => {
    grant = await obtainGrant();
  });

  it("getTicketSelection butuh grant yang cocok", async () => {
    expect((await api("/events/evt_konser_a/tickets")).status).toBe(401);
    expect(
      (await api("/events/evt_konser_a/tickets", { headers: { ...grant, "x-device-id": "lain" } })).status,
    ).toBe(401);
    await expectContract(
      await api("/events/evt_konser_a/tickets", { headers: grant }),
      "getTicketSelection",
      200,
    );
  });

  it("validateNik: valid, tidak ditemukan, format salah", async () => {
    await expectContract(
      await post("/nik/validate", { nik: "3171000000000022" }, grant),
      "validateNik",
      200,
      "valid",
    );
    await expectContract(
      await post("/nik/validate", { nik: "0000000000000000" }, grant),
      "validateNik",
      200,
      "not_found",
    );
    await expectContract(await post("/nik/validate", { nik: "12" }, grant), "validateNik", 400);
  });

  it("createBooking: batas 3 tiket, lalu sukses, lalu NIK terpakai", async () => {
    const four = ["3171000000000022", "3171000000000033", "3171000000000044", "3171000000000055"];
    await expectContract(await post("/bookings", bookingRequest(four), grant), "createBooking", 400, "2");
    const created = await expectContract(
      await post(
        "/bookings",
        bookingRequest(["3171000000000022", "3171000000000033"], "cat_festival"),
        grant,
      ),
      "createBooking",
      201,
    );
    bookingId = String(created.data.booking_id);
    const used = await post("/nik/validate", { nik: "3171000000000022" }, grant);
    expect(((await used.json()) as { data: { reason: string } }).data.reason).toBe("NIK_ALREADY_USED");
  });

  it("NIK yang sudah dipakai di event yang sama ditolak 409", async () => {
    const other = await obtainGrant();
    await expectContract(
      await post("/bookings", bookingRequest(["3171000000000022"]), other),
      "createBooking",
      409,
      "4",
    );
  });

  it("getBooking PENDING_PAYMENT dan getPaymentMethods", async () => {
    await expectContract(
      await api(`/bookings/${bookingId}`, { headers: grant }),
      "getBooking",
      200,
      "pending_payment",
    );
    await expectContract(
      await api(`/payments/${bookingId}/methods`, { headers: grant }),
      "getPaymentMethods",
      200,
    );
    expect((await api("/bookings/RB-99999", { headers: grant })).status).toBe(404);
  });

  it("initiatePayment, retryPayment, lalu ganti ke GoPay", async () => {
    expect((await post(`/payments/${bookingId}`, { method: "bank_transfer" }, grant)).status).toBe(400);
    await expectContract(
      await post(`/payments/${bookingId}`, { method: "bank_transfer", bank: "bca" }, grant),
      "initiatePayment",
      200,
      "bank_transfer",
    );
    await expectContract(
      await api(`/payments/${bookingId}/status`, { headers: grant }),
      "getPaymentStatus",
      200,
      "pending",
    );
    const retried = await expectContract(
      await post(`/payments/${bookingId}/retry`, {}, grant),
      "retryPayment",
      200,
    );
    expect(retried.data.attempt).toBe(2);
    await expectContract(
      await post(`/payments/${bookingId}`, { method: "gopay" }, grant),
      "initiatePayment",
      200,
      "gopay",
    );
  });

  it("webhook FAILED lalu PAID menerbitkan tiket", async () => {
    const webhook = (status: string) =>
      post("/payments/webhook", {
        order_id: bookingId,
        transaction_status: status,
        status_code: "200",
        gross_amount: "1700000.00",
        signature_key: "sig",
      });
    expect(
      (await post("/payments/webhook", { order_id: bookingId, transaction_status: "settlement" })).status,
    ).toBe(401);
    await expectContract(await webhook("deny"), "paymentWebhook", 200);
    await expectContract(
      await api(`/payments/${bookingId}/status`, { headers: grant }),
      "getPaymentStatus",
      200,
      "failed",
    );
    await post(`/payments/${bookingId}/retry`, {}, grant);
    await post(`/payments/${bookingId}`, { method: "bank_transfer", bank: "bni" }, grant);
    await webhook("settlement");
    await expectContract(
      await api(`/payments/${bookingId}/status`, { headers: grant }),
      "getPaymentStatus",
      200,
      "paid",
    );
    await expectContract(await api(`/bookings/${bookingId}`, { headers: grant }), "getBooking", 200, "paid");
    // Endpoint /bookings/{id}/tickets dihapus; e-tiket dibuka lewat eticket_url (?t=) di detail booking.
    const paid = (await (await api(`/bookings/${bookingId}`, { headers: grant })).json()) as {
      data: { tickets: { ticket_id: string; eticket_url: string }[] };
    };
    expect(paid.data.tickets).toHaveLength(2);
    expect(paid.data.tickets[0]?.eticket_url).toMatch(/^\/tickets\/.+\/eticket\?t=.+/);
  });

  it("getMyTickets dan getEticket", async () => {
    expect((await api("/users/me/tickets")).status).toBe(401);
    const mine = await expectContract<unknown[]>(
      await api("/users/me/tickets", { headers: BEARER }),
      "getMyTickets",
      200,
    );
    expect(mine.data.length).toBeGreaterThanOrEqual(4);
    await expectContract(await api("/tickets/TKT-001/eticket?t=signed", {}), "getEticket", 200);
    expect((await api("/tickets/TKT-404/eticket", { headers: BEARER })).status).toBe(404);
  });

  it("getDisputedPayments butuh event_id", async () => {
    expect((await api("/admin/reconciliation/disputed")).status).toBe(400);
    await expectContract(
      await api("/admin/reconciliation/disputed?event_id=evt_konser_a"),
      "getDisputedPayments",
      200,
    );
  });
});

describe("Skenario TTL", () => {
  describe("payment-expiring", () => {
    useServer("payment-expiring");

    it("booking menjadi EXPIRED setelah TTL pembayaran dan stok kembali", async () => {
      const grant = await obtainGrant();
      const created = (await (
        await post("/bookings", bookingRequest(["3171000000000044"]), grant)
      ).json()) as {
        data: { booking_id: string };
      };
      vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 46_000 });
      const status = (await (
        await api(`/payments/${created.data.booking_id}/status`, { headers: grant })
      ).json()) as {
        data: { status: string };
      };
      expect(status.data.status).toBe("EXPIRED");
      const event = (await (await api("/events/evt_konser_a")).json()) as {
        data: { ticket_categories: { id: string; available: number }[] };
      };
      expect(event.data.ticket_categories.find((category) => category.id === "cat_vip")?.available).toBe(12);
    });
  });

  describe("booking-expiring", () => {
    useServer("booking-expiring");

    it("grant kedaluwarsa menolak pemilihan tiket dan /queue/me menjadi EXPIRED", async () => {
      const queue = await joinQueue();
      let grant: Record<string, string> = {};
      for (let poll = 0; poll < 4 && !grant["x-grant-token"]; poll += 1) {
        const { data } = (await (await api("/events/evt_konser_a/queue/me", { headers: queue })).json()) as {
          data: { grant_token?: string };
        };
        if (data.grant_token) grant = { "x-grant-token": data.grant_token, ...DEVICE };
      }
      vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 76_000 });
      expect((await api("/events/evt_konser_a/tickets", { headers: grant })).status).toBe(401);
      await expectContract(
        await api("/events/evt_konser_a/queue/me", { headers: queue }),
        "getQueueMe",
        200,
        "6",
      );
    });
  });

  describe("queue-stuck", () => {
    useServer("queue-stuck");

    it("posisi tidak bergerak", async () => {
      const queue = await joinQueue();
      const poll = async () =>
        (
          (await (await api("/events/evt_konser_a/queue/me", { headers: queue })).json()) as {
            data: { state: string; now_serving: number };
          }
        ).data;
      const first = await poll();
      expect(await poll()).toEqual(first);
      expect(first.state).toBe("QUEUED");
    });
  });
});
