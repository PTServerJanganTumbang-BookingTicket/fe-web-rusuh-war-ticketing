import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import type { HttpClient, RequestOptions } from "@/core/data/http/http.client";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import { testConfig } from "@/test/support";
import { createHttpOrderService } from "../http-order.service";
import { createPaymentSessionService } from "../payment-session.service";

const BOOKING = "RB-1";

const booking = (status: string) => ({
  booking_id: BOOKING,
  status,
  event: { id: "evt_a", name: "Konser A" },
  tickets: [],
  summary: { total: 1_500_000 },
  payment_ttl: { expires_at: "2099-01-01T00:10:00Z", server_time: "2099-01-01T00:00:00Z" },
});

const failedStatus = {
  status: "FAILED",
  reason: "ditolak",
  can_retry: true,
  attempt: 1,
  payment_expires_at: "2099-01-01T00:10:00Z",
  server_time: "2099-01-01T00:05:00Z",
};
const pendingStatus = { status: "PENDING", server_time: "2099-01-01T00:05:00Z" };
const retried = {
  booking_id: BOOKING,
  status: "HELD",
  attempt: 2,
  cancelled_order_id: `${BOOKING}:1`,
  payment_expires_at: "2099-01-01T00:10:00Z",
  server_time: "2099-01-01T00:06:00Z",
};
const charged = (method: "bank_transfer" | "gopay") => ({
  method,
  instructions:
    method === "gopay"
      ? { qr_url: "https://qr", deeplink_url: "https://gojek.link/x" }
      : { bank: "bca", va_number: "8801" },
});

type Call = { verb: "GET" | "POST"; path: string; options?: RequestOptions; client: "api" | "bff" };

/** HttpClient palsu: jawaban per path, diparse dengan schema asli seperti klien produksi. */
function setup({
  session,
  grant,
  gateway = false,
}: { session?: string; grant?: string; gateway?: boolean } = {}) {
  const calls: Call[] = [];
  const responses = {
    booking: booking("PENDING_PAYMENT") as Record<string, unknown>,
    status: pendingStatus as Record<string, unknown>,
  };
  const answer = (fullPath: string, method: "bank_transfer" | "gopay"): unknown => {
    const path = fullPath.replace(/^\/account/, "");
    if (path === `/bookings/${BOOKING}`) return responses.booking;
    if (path === `/payments/${BOOKING}/status`) return responses.status;
    if (path === `/payments/${BOOKING}/methods`) return { methods: [] };
    if (path === `/payments/${BOOKING}/retry`) return retried;
    if (path === `/payments/${BOOKING}`) return charged(method);
    throw new Error(`path tak dikenal: ${path}`);
  };
  let nextMethod: "bank_transfer" | "gopay" = "gopay";
  const fakeClient = (client: Call["client"]) =>
    ({
      get: vi.fn((path: string, schema: z.ZodType, options?: RequestOptions) => {
        calls.push({ verb: "GET", path, options, client });
        return Promise.resolve(schema.parse(answer(path, nextMethod)));
      }),
      post: vi.fn((path: string, _body: unknown, schema: z.ZodType, options?: RequestOptions) => {
        calls.push({ verb: "POST", path, options, client });
        return Promise.resolve(schema.parse(answer(path, nextMethod)));
      }),
    }) as unknown as HttpClient;
  // Langsung ke API hanya pada mock di browser (appBaseUrl kosong); selain itu lewat route same-origin.
  const appConfig = gateway ? testConfig : { ...testConfig, mocking: true, appBaseUrl: "" };
  const credentialStore = {
    grantToken: () => grant ?? "gt_1",
    deviceId: () => "dev_1",
  } as unknown as CredentialStoreProtocol;
  const paymentSessionService = createPaymentSessionService();
  if (session) paymentSessionService.set(session);
  const service = createHttpOrderService({
    appConfig,
    httpClient: fakeClient("api"),
    bffHttpClient: fakeClient("bff"),
    credentialStore,
    paymentSessionService,
  });
  const posts = () => calls.filter((call) => call.verb === "POST").map((call) => call.path);
  return {
    service,
    calls,
    responses,
    posts,
    paymentSessionService,
    pay: (method: "bank_transfer" | "gopay") => {
      nextMethod = method;
      return service.initiatePayment(BOOKING, method, method === "bank_transfer" ? "bca" : undefined);
    },
  };
}

describe("orderService: bayar ulang setelah penolakan (kontrak §5.2-5.3)", () => {
  it("setelah poll FAILED, bayar langsung POST /payments/{id} tanpa /retry", async () => {
    const { service, responses, posts, pay } = setup();
    await pay("bank_transfer");
    expect(posts()).toEqual([`/payments/${BOOKING}`]);

    responses.status = failedStatus;
    expect((await service.getOrder(BOOKING)).status).toBe("FAILED");

    await pay("gopay");
    expect(posts()).toEqual([`/payments/${BOOKING}`, `/payments/${BOOKING}`]);
  });

  it("FAILED tetap membawa metode charge terakhir walau cache instruksi dikosongkan", async () => {
    const { service, responses, pay } = setup();
    await pay("bank_transfer");
    responses.status = failedStatus;
    expect(await service.getOrder(BOOKING)).toMatchObject({
      status: "FAILED",
      method: "bank_transfer",
      attempt: 1,
    });
  });

  it("charge berjalan lalu ganti metode: /retry dulu, baru POST /payments/{id}", async () => {
    const { posts, pay } = setup();
    await pay("bank_transfer");
    await pay("gopay");
    expect(posts()).toEqual([`/payments/${BOOKING}`, `/payments/${BOOKING}/retry`, `/payments/${BOOKING}`]);
  });

  it("status akhir (booking EXPIRED) membersihkan cache instruksi", async () => {
    const { service, responses, posts, pay } = setup();
    await pay("gopay");
    responses.booking = booking("EXPIRED");
    await service.getOrder(BOOKING);
    responses.booking = booking("PENDING_PAYMENT");
    await pay("bank_transfer");
    expect(posts().filter((path) => path.endsWith("/retry"))).toEqual([]);
  });
});

describe("orderService: payment session WebView (ADR-007)", () => {
  it("session mengganti grant: hanya X-Payment-Session yang dikirim, di order, metode, charge, dan retry", async () => {
    const { service, calls, pay } = setup({ session: "ps_abc" });
    await service.getOrder(BOOKING);
    await service.getAvailableMethods(BOOKING);
    await pay("gopay");
    await pay("bank_transfer");
    const sent = calls.filter(
      (call) => call.path.startsWith("/bookings") || call.path.startsWith("/payments"),
    );
    expect(sent.length).toBeGreaterThan(4);
    for (const call of sent) expect(call.options?.headers).toEqual({ "x-payment-session": "ps_abc" });
  });

  it("tanpa session tetap memakai header grant, tanpa X-Payment-Session", async () => {
    const { service, calls } = setup();
    await service.getOrder(BOOKING);
    expect(calls[0]?.options?.headers).toEqual({ "x-grant-token": "gt_1", "x-device-id": "dev_1" });
  });

  it("session yang baru ditukar dipakai request berikutnya; melepasnya kembali ke grant", async () => {
    const { service, calls, paymentSessionService } = setup();
    paymentSessionService.set("ps_late");
    await service.getOrder(BOOKING);
    expect(calls[0]?.options?.headers).toEqual({ "x-payment-session": "ps_late" });
    paymentSessionService.set(null);
    await service.getOrder(BOOKING);
    expect(calls.at(-1)?.options?.headers).toHaveProperty("x-grant-token");
  });
});

describe("orderService: tiket di booking PAID (kontrak §4.4)", () => {
  it("ticket_id dan eticket_url dipetakan per kursi; kursi yang belum terbit tanpa keduanya", async () => {
    const { service, responses } = setup();
    responses.booking = {
      ...booking("PAID"),
      payment_ttl: undefined,
      tickets: [
        {
          ticket_id: "TKT-001",
          category: "VIP",
          price: 1_500_000,
          nik_masked: "3171**********22",
          eticket_url: "/tickets/TKT-001/eticket?t=et_9f3a2c",
        },
        { category: "VIP", price: 1_500_000, nik_masked: "3171**********33" },
      ],
    };
    const order = await service.getOrder(BOOKING);
    expect(order.status).toBe("PAID");
    expect(order.items).toEqual([
      {
        category: "VIP",
        priceIdr: 1_500_000,
        nikMasked: "3171**********22",
        ticketId: "TKT-001",
        eticketUrl: "/tickets/TKT-001/eticket?t=et_9f3a2c",
      },
      { category: "VIP", priceIdr: 1_500_000, nikMasked: "3171**********33" },
    ]);
  });
});

describe("orderService: customer login lewat route same-origin (kontrak v2.20)", () => {
  it("booking, status, metode, charge, dan retry lewat /account agar Bearer dari cookie ikut", async () => {
    const { service, calls, pay } = setup({ gateway: true });
    await service.getOrder(BOOKING);
    await service.getAvailableMethods(BOOKING);
    await pay("gopay");
    await pay("bank_transfer");
    const routed = calls;
    expect(new Set(routed.map((call) => call.client))).toEqual(new Set(["bff"]));
    expect(routed.map((call) => `${call.verb} ${call.path}`)).toEqual(
      expect.arrayContaining([
        `GET /account/bookings/${BOOKING}`,
        `GET /account/payments/${BOOKING}/status`,
        `GET /account/payments/${BOOKING}/methods`,
        `POST /account/payments/${BOOKING}`,
        `POST /account/payments/${BOOKING}/retry`,
      ]),
    );
    expect(routed[0]?.options?.headers).toHaveProperty("x-grant-token");
  });

  it("WebView (payment session) tetap langsung ke API: tidak ada cookie akun di sana", async () => {
    const { service, calls } = setup({ gateway: true, session: "ps_1" });
    await service.getOrder(BOOKING);
    expect(calls.map((call) => `${call.client} ${call.path}`)).toEqual([
      `api /bookings/${BOOKING}`,
      `api /payments/${BOOKING}/status`,
    ]);
  });
});

describe("orderService: status booking SELECTING dan PENDING_CANCELLATION", () => {
  it("SELECTING dipetakan apa adanya tanpa memanggil /status", async () => {
    const { service, responses, calls } = setup();
    responses.booking = { ...booking("SELECTING"), payment_ttl: undefined };
    expect((await service.getOrder(BOOKING)).status).toBe("SELECTING");
    expect(calls.some((call) => call.path.endsWith("/status"))).toBe(false);
  });

  it("PENDING_CANCELLATION dipetakan apa adanya (grace, bukan EXPIRED)", async () => {
    const { service, responses } = setup();
    responses.booking = booking("PENDING_CANCELLATION");
    expect((await service.getOrder(BOOKING)).status).toBe("PENDING_CANCELLATION");
  });
});

describe("orderService: kode error bisnis diteruskan ke klien HTTP", () => {
  it("charge dan /retry membawa serverErrorCodes untuk empat kode pembayaran", async () => {
    const { calls, pay } = setup();
    await pay("bank_transfer");
    await pay("gopay");
    const posts = calls.filter((call) => call.verb === "POST");
    expect(posts).toHaveLength(3);
    for (const call of posts) {
      expect(call.options?.serverErrorCodes).toEqual({
        BOOKING_STATUS_INVALID: "BOOKING_STATUS_INVALID",
        PAYMENT_WINDOW_CLOSED: "PAYMENT_WINDOW_CLOSED",
        MAX_ATTEMPTS_EXCEEDED: "MAX_ATTEMPTS_EXCEEDED",
        PAYMENT_ALREADY_SETTLED: "PAYMENT_ALREADY_SETTLED",
      });
    }
  });
});
