// Service HTTP di `data/` diuji terhadap MSW, di-resolve dari container yang sama dengan produksi.
import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { AppFailure } from "@/core/domain/app-error";
import { setupMockServer, setupTestContainer, TEST_APP_ORIGIN } from "./support";

const server = setupMockServer();
const { eventService, queueService, bookingService, orderService, paymentSimulatorService, sessionService } =
  setupTestContainer().cradle;

const listEventsUseCase = () => eventService.list();
const getQueueStateUseCase = (eventId: string) => queueService.getState(eventId);
const getBookingSessionUseCase = (eventId: string) => bookingService.getSession(eventId);
const getOrderUseCase = (orderId: string) => orderService.get(orderId);
const initiatePayment = orderService.initiatePayment.bind(orderService);
const emulatePaymentOutcome = paymentSimulatorService.simulate.bind(paymentSimulatorService);

async function failureOf(promise: Promise<unknown>) {
  const thrown: unknown = await promise.catch((e: unknown) => e);
  expect(thrown).toBeInstanceOf(AppFailure);
  return (thrown as AppFailure).error;
}

describe("listEventsUseCase", () => {
  it("mem-parse response valid", async () => {
    const events = await listEventsUseCase();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toMatchObject({ id: expect.any(String), status: expect.any(String) });
  });

  it("response dengan bentuk salah menjadi invalid_response", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.json({ events: [{ id: 1 }] })));
    expect(await failureOf(listEventsUseCase())).toEqual({ kind: "invalid_response" });
  });

  it.each([
    ["QUEUE_TOKEN_INVALID", 401],
    ["ACCESS_EXPIRED", 410],
  ])("memetakan error code %s", async (code, status) => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.json({ code }, { status })));
    expect(await failureOf(listEventsUseCase())).toEqual({ kind: "api", code, status });
  });

  it("error tanpa code dikenal menjadi unknown", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.text("boom", { status: 503 })));
    expect(await failureOf(listEventsUseCase())).toEqual({ kind: "unknown", status: 503 });
  });

  it("gagal jaringan menjadi network", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.error()));
    expect(await failureOf(listEventsUseCase())).toEqual({ kind: "network" });
  });
});

describe("getQueueStateUseCase", () => {
  it("memetakan waiting dengan retryAfterMs", async () => {
    expect(await getQueueStateUseCase("evt-1")).toEqual({
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
        HttpResponse.json({
          status: "admitted",
          eventName: "Konser A",
          accessToken: "tok",
          expiresAt: "2026-10-19T10:10:00.000Z",
        }),
      ),
    );
    expect(await getQueueStateUseCase("evt-1")).toEqual({
      status: "admitted",
      eventName: "Konser A",
      accessToken: "tok",
      expiresAt: "2026-10-19T10:10:00.000Z",
    });
  });
});

describe("getBookingSessionUseCase", () => {
  it("mem-parse sesi booking dengan kuota dan kategori", async () => {
    const session = await getBookingSessionUseCase("evt-1");
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
    expect(await failureOf(getBookingSessionUseCase("evt-1"))).toEqual({
      kind: "api",
      code: "ACCESS_EXPIRED",
      status: 410,
    });
  });
});

describe("pembayaran", () => {
  it("order baru menunggu pemilihan metode", async () => {
    const order = await getOrderUseCase("RB-T1");
    expect(order).toMatchObject({ orderId: "RB-T1", status: "awaiting_method", totalIdr: 1_500_000 });
    expect(order.instruction).toBeUndefined();
  });

  it.each([
    ["virtual_account", "virtual_account"],
    ["e_wallet", "qr"],
    ["bank_transfer", "bank_transfer"],
  ] as const)("memilih %s menghasilkan instruksi %s dan status pending", async (method, type) => {
    const order = await initiatePayment(`RB-T2-${method}`, method);
    expect(order.status).toBe("pending");
    expect(order.instruction?.type).toBe(type);
  });

  it("simulasi berhasil dan gagal hanya berlaku saat pending", async () => {
    expect((await emulatePaymentOutcome("RB-T3", "success")).status).toBe("awaiting_method");
    await initiatePayment("RB-T3", "e_wallet");
    expect((await emulatePaymentOutcome("RB-T3", "success")).status).toBe("paid");

    await initiatePayment("RB-T4", "virtual_account");
    expect((await emulatePaymentOutcome("RB-T4", "fail")).status).toBe("failed");
  });

  it("status akhir tidak berubah lagi", async () => {
    await initiatePayment("RB-T5", "e_wallet");
    await emulatePaymentOutcome("RB-T5", "success");
    expect((await emulatePaymentOutcome("RB-T5", "fail")).status).toBe("paid");
  });
});

describe("sessionService", () => {
  it("mengirim access token ke route same-origin", async () => {
    let received: unknown;
    server.use(
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, async ({ request }) => {
        received = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await sessionService.start("tok");
    expect(received).toEqual({ accessToken: "tok" });
  });

  it("gagal dari route menjadi unknown, gagal jaringan menjadi network", async () => {
    server.use(
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 500 })),
    );
    expect(await failureOf(sessionService.start("tok"))).toEqual({ kind: "unknown", status: 500 });

    server.use(http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => HttpResponse.error()));
    expect(await failureOf(sessionService.start("tok"))).toEqual({ kind: "network" });
  });
});

describe("service SSE", () => {
  it("queueUpdatesService membuka stream antrian dan memetakan retryAfter ke ms", async () => {
    const { setupFakeEventSources } = await import("./fake-event-source");
    const { asValue } = await import("awilix");
    const fakes = setupFakeEventSources();
    const { queueUpdatesService, orderUpdatesService } = setupTestContainer({
      eventSourceFactory: asValue(fakes.factory),
    }).cradle;
    const next = vi.fn();
    queueUpdatesService.watch("evt 1", { next, connected: vi.fn(), disconnected: vi.fn() });
    const source = fakes.find("/queue/stream")!;
    expect(source.url).toBe(`${MOCK_API_BASE_URL}/events/evt%201/queue/stream`);
    source.emit("queue", {
      status: "waiting",
      eventName: "Konser A",
      position: 10,
      joinedPosition: 20,
      etaSeconds: 30,
      retryAfterSeconds: 2,
    });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: "waiting", retryAfterMs: 2000 }));

    orderUpdatesService.watch("RB-1", { next, connected: vi.fn(), disconnected: vi.fn() });
    expect(fakes.find("/orders/")?.url).toBe(`${MOCK_API_BASE_URL}/orders/RB-1/stream`);
  });
});
