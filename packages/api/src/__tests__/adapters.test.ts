import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { AppFailure } from "@rusuh/core";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { server } from "@rusuh/mocks/node";
import { emulatePaymentOutcome, getBookingSession, getOrder, getQueueState, listEvents, startPayment } from "..";

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function failureOf(promise: Promise<unknown>) {
  const thrown: unknown = await promise.catch((e: unknown) => e);
  expect(thrown).toBeInstanceOf(AppFailure);
  return (thrown as AppFailure).error;
}

describe("listEvents", () => {
  it("mem-parse response valid", async () => {
    const events = await listEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toMatchObject({ id: expect.any(String), status: expect.any(String) });
  });

  it("response dengan bentuk salah menjadi invalid_response", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.json({ events: [{ id: 1 }] })));
    expect(await failureOf(listEvents())).toEqual({ kind: "invalid_response" });
  });

  it.each([
    ["QUEUE_TOKEN_INVALID", 401],
    ["ACCESS_EXPIRED", 410],
  ])("memetakan error code %s", async (code, status) => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.json({ code }, { status })));
    expect(await failureOf(listEvents())).toEqual({ kind: "api", code, status });
  });

  it("error tanpa code dikenal menjadi unknown", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.text("boom", { status: 503 })));
    expect(await failureOf(listEvents())).toEqual({ kind: "unknown", status: 503 });
  });

  it("gagal jaringan menjadi network", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.error()));
    expect(await failureOf(listEvents())).toEqual({ kind: "network" });
  });
});

describe("getQueueState", () => {
  it("memetakan waiting dengan retryAfterMs", async () => {
    expect(await getQueueState("evt-1")).toEqual({
      status: "waiting",
      eventName: "Konser A — Jakarta",
      position: 1248,
      joinedPosition: 1248,
      etaSeconds: 240,
      retryAfterMs: 2000,
    });
  });

  it("memetakan admitted pada giliran akhir", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue`, () =>
        HttpResponse.json({ status: "admitted", eventName: "Konser A", accessToken: "tok", expiresAt: "2026-10-19T10:10:00.000Z" }),
      ),
    );
    expect(await getQueueState("evt-1")).toEqual({
      status: "admitted",
      eventName: "Konser A",
      accessToken: "tok",
      expiresAt: "2026-10-19T10:10:00.000Z",
    });
  });
});

describe("getBookingSession", () => {
  it("mem-parse sesi booking dengan kuota dan kategori", async () => {
    const session = await getBookingSession("evt-1");
    expect(session.quota).toEqual({ max: 3, used: 0, remaining: 3 });
    expect(session.categories.map((c) => c.id)).toEqual(["vip", "festival", "tribune"]);
    expect(session.maskedNik).toContain("•");
  });

  it("memetakan ACCESS_EXPIRED dari server", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id/booking-session`, () =>
        HttpResponse.json({ code: "ACCESS_EXPIRED" }, { status: 410 }),
      ),
    );
    expect(await failureOf(getBookingSession("evt-1"))).toEqual({ kind: "api", code: "ACCESS_EXPIRED", status: 410 });
  });
});

describe("pembayaran", () => {
  it("order baru menunggu pemilihan metode", async () => {
    const order = await getOrder("RB-T1");
    expect(order).toMatchObject({ orderId: "RB-T1", status: "awaiting_method", totalIdr: 1_500_000 });
    expect(order.instruction).toBeUndefined();
  });

  it.each([
    ["virtual_account", "virtual_account"],
    ["e_wallet", "qr"],
    ["bank_transfer", "bank_transfer"],
  ] as const)("memilih %s menghasilkan instruksi %s dan status pending", async (method, type) => {
    const order = await startPayment(`RB-T2-${method}`, method);
    expect(order.status).toBe("pending");
    expect(order.instruction?.type).toBe(type);
  });

  it("simulasi berhasil dan gagal hanya berlaku saat pending", async () => {
    expect((await emulatePaymentOutcome("RB-T3", "success")).status).toBe("awaiting_method");
    await startPayment("RB-T3", "e_wallet");
    expect((await emulatePaymentOutcome("RB-T3", "success")).status).toBe("paid");

    await startPayment("RB-T4", "virtual_account");
    expect((await emulatePaymentOutcome("RB-T4", "fail")).status).toBe("failed");
  });

  it("status akhir tidak berubah lagi", async () => {
    await startPayment("RB-T5", "e_wallet");
    await emulatePaymentOutcome("RB-T5", "success");
    expect((await emulatePaymentOutcome("RB-T5", "fail")).status).toBe("paid");
  });
});
