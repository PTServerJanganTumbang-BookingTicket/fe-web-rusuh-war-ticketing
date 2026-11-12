// Service HTTP di `data/` diuji terhadap MSW, di-resolve dari container yang sama dengan produksi.
import { afterEach, describe, expect, it, vi } from "vitest";
import { asValue } from "awilix";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { AppFailure } from "@/core/domain/app-error";
import { setupFakeEventSources } from "../fake-event-source";
import {
  admitToQueue,
  OPEN_EVENT_ID,
  setupMockServer,
  setupTestContainer,
  TEST_APP_ORIGIN,
  testConfig,
} from "../support";

const server = setupMockServer();

async function failureOf(promise: Promise<unknown>) {
  const thrown: unknown = await promise.catch((e: unknown) => e);
  expect(thrown).toBeInstanceOf(AppFailure);
  return (thrown as AppFailure).error;
}

const envelope = (data: unknown, code = 200, message = "Success") =>
  HttpResponse.json({ meta: { code, message }, data }, { status: code });

/** Membuat booking lewat API mock, karena FE belum punya alur submit booking (tasks.md 7.2). */
async function createBooking(grantToken: string, deviceId: string) {
  const response = await fetch(`${MOCK_API_BASE_URL}/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-grant-token": grantToken, "x-device-id": deviceId },
    body: JSON.stringify({
      event_id: OPEN_EVENT_ID,
      tickets: [{ category_id: "cat_vip", nik: "3171000000000022", holder_email: "a@b.co" }],
      contact_email: "a@b.co",
      terms_version: "2026-10-01",
    }),
  });
  const { data } = (await response.json()) as { data: { booking_id: string } };
  return data.booking_id;
}

describe("eventService", () => {
  const { eventService } = setupTestContainer().cradle;

  it("membuka envelope dan memetakan event kontrak ke model domain", async () => {
    const events = await eventService.getEvents();
    expect(events.map((event) => event.id)).toEqual(["evt_konser_a", "evt_konser_b", "evt_konser_c"]);
    expect(events[0]).toEqual({
      id: "evt_konser_a",
      name: "Konser A",
      date: "2026-12-25",
      venue: "GBK, Jakarta",
      category: "LIVE MUSIC",
      saleStartsAt: "2026-11-10T02:00:00Z",
      imageUrl: "/images/concert-placeholder.webp",
      status: "AVAILABLE",
      queueState: "OPEN",
      display: { enabled: true, action: "queue", labelKey: "home.event.cta.queue", badgeKey: undefined },
    });
    expect(events[2]?.display).toEqual({
      enabled: false,
      action: "disabled",
      labelKey: "home.event.notOpen",
      badgeKey: "home.event.badge.notOpen",
    });
  });

  it("data dengan bentuk salah menjadi invalid_response", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => envelope([{ id: 1 }])));
    expect(await failureOf(eventService.getEvents())).toEqual({ kind: "invalid_response" });
  });

  it("response tanpa envelope menjadi invalid_response", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.json([])));
    expect(await failureOf(eventService.getEvents())).toEqual({ kind: "invalid_response" });
  });

  it("meta.message yang sama dengan kode error FE dikenali", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => envelope({}, 401, "QUEUE_TOKEN_INVALID")));
    expect(await failureOf(eventService.getEvents())).toEqual({
      kind: "api",
      code: "QUEUE_TOKEN_INVALID",
      status: 401,
    });
  });

  it("error tanpa kode dikenal menjadi unknown", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.text("boom", { status: 503 })));
    expect(await failureOf(eventService.getEvents())).toEqual({ kind: "unknown", status: 503 });
  });

  it("gagal jaringan menjadi network", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.error()));
    expect(await failureOf(eventService.getEvents())).toEqual({ kind: "network" });
  });
});

/** Callback Midtrans Core API; tanda tangan ada di body. */
const midtransCallback = (orderId: string, transactionStatus: string) => ({
  order_id: orderId,
  transaction_status: transactionStatus,
  status_code: "200",
  gross_amount: "1500000.00",
  signature_key: "sig",
});

describe("queueService", () => {
  /** Path setiap request antrian yang keluar selama `run`, supaya alur join → stream → /me bisa diperiksa. */
  async function queuePaths(run: () => Promise<unknown>) {
    const paths: string[] = [];
    server.events.on("request:start", ({ request }) => {
      const { pathname } = new URL(request.url);
      if (pathname.includes("/queue/")) paths.push(pathname.slice(pathname.indexOf("/queue/")));
    });
    try {
      await run();
    } finally {
      server.events.removeAllListeners();
    }
    return paths;
  }

  it("join dengan X-Device-Id lalu menghitung posisi dari now_serving, tanpa /queue/serving dan /queue/me", async () => {
    const container = setupTestContainer();
    let deviceId: string | null = null;
    server.events.on("request:start", ({ request }) => {
      if (request.url.endsWith("/queue/join")) deviceId = request.headers.get("x-device-id");
    });
    const paths = await queuePaths(async () => {
      expect(await container.cradle.queueService.join(OPEN_EVENT_ID)).toEqual({
        status: "waiting",
        eventName: "Konser A",
        fullBooked: false,
        stale: false,
        position: 1248,
        joinedPosition: 1248,
        // Laju belum diketahui saat join; stream atau /queue/serving yang mengisinya.
        ratePerMin: 0,
        retryAfterMs: 5000,
      });
    });
    expect(paths).toEqual(["/queue/join"]);
    expect(deviceId).toBe(container.cradle.credentialStore.deviceId());
    expect(container.cradle.queueTicketCache.get(OPEN_EVENT_ID)).toMatchObject({
      ticketNo: 32_748,
      streamUrl: `/events/${OPEN_EVENT_ID}/queue/stream`,
      ratePerMin: 0,
    });
  });

  it("join dengan posisi <= 0 mengambil state dari /queue/me", async () => {
    server.use(
      http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () =>
        envelope({ ticket_no: 10, now_serving: 10, position: 0, queue_token: "qt_1" }),
      ),
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
        envelope({ state: "GRANTED", grant_token: "gt_1", booking_expires_at: "2026-11-10T02:05:00Z" }),
      ),
    );
    const { queueService } = setupTestContainer().cradle;
    const paths = await queuePaths(async () => {
      expect(await queueService.join(OPEN_EVENT_ID)).toMatchObject({
        status: "admitted",
        accessToken: "gt_1",
      });
    });
    expect(paths).toEqual(["/queue/join", "/queue/me"]);
  });

  it("join ulang dengan state bukan QUEUED mengambil state dari /queue/me walau masih ada jarak", async () => {
    server.use(
      http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () =>
        envelope({ ticket_no: 100, now_serving: 50, position: 50, state: "GRANTED", rejoined: true }),
      ),
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
        envelope({ state: "GRANTED", grant_token: "gt_2", booking_expires_at: "2026-11-10T02:05:00Z" }),
      ),
    );
    const { queueService } = setupTestContainer().cradle;
    expect(await queueService.join(OPEN_EVENT_ID)).toMatchObject({ status: "admitted", accessToken: "gt_2" });
  });

  it("join ulang dengan state QUEUED tetap menghitung posisi dari now_serving", async () => {
    server.use(
      http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () =>
        envelope({ ticket_no: 100, now_serving: 60, position: 40, state: "QUEUED", rejoined: true }),
      ),
    );
    const { queueService } = setupTestContainer().cradle;
    expect(await queueService.join(OPEN_EVENT_ID)).toMatchObject({ status: "waiting", position: 40 });
  });

  it("join tanpa now_serving menurunkannya dari ticket_no − position", async () => {
    server.use(
      http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () =>
        envelope({ ticket_no: 100, position: 30, queue_token: "qt_1" }),
      ),
    );
    const { queueService } = setupTestContainer().cradle;
    expect(await queueService.join(OPEN_EVENT_ID)).toMatchObject({ status: "waiting", position: 30 });
  });

  describe("getOwnState dan getState", () => {
    it("getOwnState hanya memanggil /queue/me", async () => {
      const { queueService } = setupTestContainer().cradle;
      await queueService.join(OPEN_EVENT_ID);
      const paths = await queuePaths(async () => {
        // Mock memajukan antrian 416 langkah tiap /queue/me.
        expect(await queueService.getOwnState(OPEN_EVENT_ID)).toMatchObject({
          status: "waiting",
          position: 832,
        });
      });
      expect(paths).toEqual(["/queue/me"]);
    });

    it("tanpa tiket tersimpan getOwnState dan getState join dulu", async () => {
      const { queueService } = setupTestContainer().cradle;
      expect(await queuePaths(() => queueService.getOwnState(OPEN_EVENT_ID))).toEqual(["/queue/join"]);
      const other = setupTestContainer().cradle.queueService;
      expect(await queuePaths(() => other.getState(OPEN_EVENT_ID))).toEqual(["/queue/join"]);
    });

    it("getState (polling cadangan) hanya memanggil /queue/serving dan menghitung posisi + laju", async () => {
      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/serving`, () =>
          envelope({ now_serving: 32_648, rate_per_min: 50, state: "OPEN", poll_after_ms: 3000 }),
        ),
      );
      const { queueService, queueTicketCache } = setupTestContainer().cradle;
      await queueService.join(OPEN_EVENT_ID);
      const paths = await queuePaths(async () => {
        expect(await queueService.getState(OPEN_EVENT_ID)).toMatchObject({
          status: "waiting",
          position: 100,
          ratePerMin: 50,
          fullBooked: false,
          retryAfterMs: 3000,
        });
      });
      expect(paths).toEqual(["/queue/serving"]);
      expect(queueTicketCache.get(OPEN_EVENT_ID)?.ratePerMin).toBe(50);
    });

    it.each([
      [5, 1_000],
      [100, 2_000],
      [500, 5_000],
      [5_000, 10_000],
    ])("interval polling posisi %i mengikuti poll_tiers (%i ms)", async (position, expected) => {
      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/serving`, () =>
          envelope({
            now_serving: 32_748 - position,
            rate_per_min: 10,
            state: "OPEN",
            poll_after_ms: 7_777,
            poll_tiers: [
              { max_position: 10, poll_after_ms: 1_000 },
              { max_position: 100, poll_after_ms: 2_000 },
              { max_position: 1_000, poll_after_ms: 5_000 },
              { max_position: null, poll_after_ms: 10_000 },
            ],
          }),
        ),
      );
      const { queueService } = setupTestContainer().cradle;
      await queueService.join(OPEN_EVENT_ID);
      expect(await queueService.getState(OPEN_EVENT_ID)).toMatchObject({ position, retryAfterMs: expected });
    });

    it("tanpa poll_tiers dan poll_after_ms memakai jeda cadangan 5 detik", async () => {
      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/serving`, () =>
          envelope({ now_serving: 32_000, rate_per_min: 0 }),
        ),
      );
      const { queueService } = setupTestContainer().cradle;
      await queueService.join(OPEN_EVENT_ID);
      expect(await queueService.getState(OPEN_EVENT_ID)).toMatchObject({ retryAfterMs: 5000, ratePerMin: 0 });
    });

    it("FULL_BOOKED di /queue/serving menandai fullBooked", async () => {
      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/serving`, () =>
          envelope({ now_serving: 32_000, rate_per_min: 10, state: "FULL_BOOKED" }),
        ),
      );
      const { queueService } = setupTestContainer().cradle;
      await queueService.join(OPEN_EVENT_ID);
      expect(await queueService.getState(OPEN_EVENT_ID)).toMatchObject({
        status: "waiting",
        fullBooked: true,
      });
    });

    it("CLOSED di /queue/serving menjadi ended (closed)", async () => {
      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/serving`, () =>
          envelope({ now_serving: 32_000, rate_per_min: 10, state: "CLOSED" }),
        ),
      );
      const { queueService } = setupTestContainer().cradle;
      await queueService.join(OPEN_EVENT_ID);
      expect(await queueService.getState(OPEN_EVENT_ID)).toEqual({
        status: "ended",
        eventName: "Konser A",
        reason: "closed",
      });
    });

    it("giliran tiba (now_serving >= ticket_no) mengambil state dari /queue/me", async () => {
      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/serving`, () =>
          envelope({ now_serving: 32_748, rate_per_min: 10, state: "OPEN" }),
        ),
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
          envelope({ state: "GRANTED", grant_token: "gt_3", booking_expires_at: "2026-11-10T02:05:00Z" }),
        ),
      );
      const { queueService } = setupTestContainer().cradle;
      await queueService.join(OPEN_EVENT_ID);
      const paths = await queuePaths(async () => {
        expect(await queueService.getState(OPEN_EVENT_ID)).toMatchObject({
          status: "admitted",
          accessToken: "gt_3",
        });
      });
      expect(paths).toEqual(["/queue/serving", "/queue/me"]);
    });

    it("/queue/serving dan /queue/me sama-sama gagal diteruskan sebagai galat, bukan laju 0", async () => {
      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/serving`, () => envelope({}, 503, "down")),
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () => envelope({}, 503, "down")),
      );
      const { queueService } = setupTestContainer().cradle;
      await queueService.join(OPEN_EVENT_ID);
      expect(await failureOf(queueService.getState(OPEN_EVENT_ID))).toMatchObject({ status: 503 });
    });

    it("/queue/serving gagal: posisi diambil dari /queue/me, termasuk saat giliran sudah tiba", async () => {
      server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/queue/serving`, () => envelope({}, 404, "nf")));
      const { queueService } = setupTestContainer().cradle;
      await queueService.join(OPEN_EVENT_ID);
      server.use(
        http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
          envelope({
            state: "GRANTED",
            grant_token: "gt_1",
            booking_expires_at: "2026-10-19T10:10:00.000Z",
            server_time: "2026-10-19T10:05:00.000Z",
          }),
        ),
      );
      expect(await queueService.getState(OPEN_EVENT_ID)).toMatchObject({ status: "admitted" });
    });
  });

  it("memetakan GRANTED ke admitted dengan grant token", async () => {
    const container = setupTestContainer();
    const token = await admitToQueue(container);
    expect(token).toMatch(/^gt_/);
    expect(container.cradle.credentialStore.grantToken()).toBe(token);
  });

  it("join hanya sekali per event; polling berikutnya tidak join lagi", async () => {
    const { queueService } = setupTestContainer().cradle;
    const joins = vi.fn();
    server.events.on("request:start", ({ request }) => {
      if (request.url.endsWith("/queue/join")) joins();
    });
    await queueService.getState(OPEN_EVENT_ID);
    await queueService.getState(OPEN_EVENT_ID);
    server.events.removeAllListeners();
    expect(joins).toHaveBeenCalledTimes(1);
  });

  it("antrian penuh (503) menjadi QUEUE_FULL", async () => {
    const { queueService } = setupTestContainer().cradle;
    expect(await failureOf(queueService.join("evt_konser_b"))).toEqual({
      kind: "api",
      code: "QUEUE_FULL",
      status: 503,
    });
  });

  it("join saat sale sudah ditutup (410) menjadi SALE_CLOSED", async () => {
    server.use(
      http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () =>
        HttpResponse.json({ meta: { code: 410, message: "Tiket sudah habis" } }, { status: 410 }),
      ),
    );
    const { queueService } = setupTestContainer().cradle;
    expect(await failureOf(queueService.join(OPEN_EVENT_ID))).toEqual({
      kind: "api",
      code: "SALE_CLOSED",
      status: 410,
    });
  });

  it("join mengirim captcha_token dari konfigurasi CAPTCHA event", async () => {
    const { queueService } = setupTestContainer().cradle;
    let body: unknown;
    server.events.on("request:start", async ({ request }) => {
      if (request.url.endsWith("/queue/join")) body = await request.clone().json();
    });
    await queueService.join(OPEN_EVENT_ID);
    server.events.removeAllListeners();
    expect(body).toEqual({ captcha_token: "mock-captcha-token" });
  });

  it("event tanpa konfigurasi CAPTCHA tetap join dengan token kosong", async () => {
    let body: unknown;
    server.use(
      http.get(`${MOCK_API_BASE_URL}/events/:id`, () =>
        envelope({ id: OPEN_EVENT_ID, name: "Konser A", location: { venue: "GBK", city: "Jakarta" } }),
      ),
      http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, async ({ request }) => {
        body = await request.json();
        return envelope({ ticket_no: 10, position: 5, queue_token: "qt_1" });
      }),
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
        envelope({ state: "QUEUED", ticket_no: 10, now_serving: 5 }),
      ),
    );
    const { queueService } = setupTestContainer().cradle;
    expect(await queueService.join(OPEN_EVENT_ID)).toMatchObject({ status: "waiting", position: 5 });
    expect(body).toEqual({ captcha_token: "" });
  });

  it.each([
    [400, "CAPTCHA_FAILED"],
    [403, "CAPTCHA_FAILED"],
    [409, "SALE_NOT_OPEN"],
    [429, "RATE_LIMITED"],
  ])("join %i menjadi %s", async (status, code) => {
    server.use(
      http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () => envelope({}, status, "ditolak")),
    );
    const { queueService } = setupTestContainer().cradle;
    expect(await failureOf(queueService.join(OPEN_EVENT_ID))).toEqual({ kind: "api", code, status });
  });

  it("join antrian kosong langsung diberi giliran: tanpa nomor antrian, state diambil dari /queue/me", async () => {
    server.use(
      http.post(`${MOCK_API_BASE_URL}/events/:id/queue/join`, () =>
        envelope({
          granted: true,
          grant_token: "gt_abc123",
          queue_token: "qt_1",
          booking_expires_at: "2026-11-10T02:05:00Z",
        }),
      ),
      http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () =>
        envelope({ state: "GRANTED", grant_token: "gt_abc123", booking_expires_at: "2026-11-10T02:05:00Z" }),
      ),
    );
    const { queueService } = setupTestContainer().cradle;
    expect(await queueService.join(OPEN_EVENT_ID)).toMatchObject({
      status: "admitted",
      accessToken: "gt_abc123",
    });
  });

  describe("tanpa cookie (apiCredentials omit, backend lintas origin)", () => {
    const headerMode = () => setupTestContainer({}, { ...testConfig, apiCredentials: "omit" }).cradle;
    const seen = () => {
      const requests: { path: string; token: string | null; device: string | null }[] = [];
      server.events.on("request:start", ({ request }) => {
        requests.push({
          path: new URL(request.url).pathname,
          token: request.headers.get("x-queue-token"),
          device: request.headers.get("x-device-id"),
        });
      });
      return requests;
    };
    afterEach(() => {
      server.events.removeAllListeners();
      // Token antrian disimpan per tab; jangan bocor ke test berikutnya.
      globalThis.sessionStorage?.clear();
    });

    it("token dari respons join disimpan lalu dikirim sebagai X-Queue-Token bersama X-Device-Id ke /queue/me", async () => {
      const requests = seen();
      const { queueService, credentialStore } = headerMode();
      expect(await queueService.join(OPEN_EVENT_ID)).toMatchObject({ status: "waiting" });
      await queueService.getOwnState(OPEN_EVENT_ID);

      const token = credentialStore.queueToken(OPEN_EVENT_ID);
      expect(token).toMatch(/^qt_/);
      const me = requests.find((request) => request.path.endsWith("/queue/me"))!;
      expect(me).toMatchObject({ token, device: credentialStore.deviceId() });
      expect(requests.find((request) => request.path.endsWith("/queue/join"))!.token).toBeNull();
    });

    it("token yang tersimpan ikut saat join ulang, jadi kembali ke tempat yang sama", async () => {
      const first = headerMode();
      const before = await first.queueService.join(OPEN_EVENT_ID);
      const token = first.credentialStore.queueToken(OPEN_EVENT_ID)!;

      // Halaman dimuat ulang: tiket di memori hilang, token masih ada di penyimpanan tab.
      const requests = seen();
      const again = headerMode();
      again.credentialStore.saveQueueToken(OPEN_EVENT_ID, token);
      const after = await again.queueService.join(OPEN_EVENT_ID);
      expect(requests.find((request) => request.path.endsWith("/queue/join"))!.token).toBe(token);
      expect(after).toMatchObject({ status: "waiting", joinedPosition: expect.any(Number) });
      expect(before.status).toBe("waiting");
    });

    it("401 dari /queue/me membuang token dan tiket; keluar dari antrian juga", async () => {
      const { queueService, credentialStore } = headerMode();
      await queueService.join(OPEN_EVENT_ID);
      server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () => envelope({}, 401, "x")));
      expect(await failureOf(queueService.getOwnState(OPEN_EVENT_ID))).toMatchObject({
        code: "QUEUE_TOKEN_INVALID",
      });
      expect(credentialStore.queueToken(OPEN_EVENT_ID)).toBeNull();

      credentialStore.saveQueueToken(OPEN_EVENT_ID, "qt_lama");
      queueService.leave(OPEN_EVENT_ID);
      expect(credentialStore.queueToken(OPEN_EVENT_ID)).toBeNull();
    });
  });

  it("mode cookie (bawaan): token antrian tidak disimpan dan tidak dikirim lewat header", async () => {
    let token: string | null = "unset";
    server.events.on("request:start", ({ request }) => {
      if (request.url.endsWith("/queue/me")) token = request.headers.get("x-queue-token");
    });
    const { queueService, credentialStore } = setupTestContainer().cradle;
    await queueService.join(OPEN_EVENT_ID);
    await queueService.getOwnState(OPEN_EVENT_ID);
    server.events.removeAllListeners();
    expect(token).toBeNull();
    expect(credentialStore.queueToken(OPEN_EVENT_ID)).toBeNull();
  });

  it("401 dari /queue/me menjadi QUEUE_TOKEN_INVALID", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () => envelope({}, 401, "Unauthorized")));
    const { queueService } = setupTestContainer().cradle;
    await queueService.join(OPEN_EVENT_ID);
    expect(await failureOf(queueService.getOwnState(OPEN_EVENT_ID))).toEqual({
      kind: "api",
      code: "QUEUE_TOKEN_INVALID",
      status: 401,
    });
  });
});

describe("bookingService", () => {
  it("mengirim grant dan memetakan pemilihan tiket ke sesi booking", async () => {
    const container = setupTestContainer();
    await admitToQueue(container);
    const session = await container.cradle.bookingService.getSession(OPEN_EVENT_ID);
    expect(session.eventName).toBe("Konser A");
    expect(session.maskedNik).toBeNull();
    expect(session.quota).toEqual({ max: 3, used: 0, remaining: 3 });
    expect(session.categories).toEqual([
      {
        id: "cat_vip",
        name: "VIP",
        description: "Lebih dekat dengan energi panggung.",
        priceIdr: 1_500_000,
        stock: 12,
      },
      {
        id: "cat_festival",
        name: "Festival",
        description: "Nikmati konser dari area festival.",
        priceIdr: 850_000,
        stock: 240,
      },
      {
        id: "cat_tribune",
        name: "Tribune",
        description: "Area tribun dengan panorama panggung.",
        priceIdr: 500_000,
        stock: 0,
      },
    ]);
  });

  it("tanpa grant: 401 menjadi ACCESS_EXPIRED", async () => {
    const { bookingService } = setupTestContainer().cradle;
    expect(await failureOf(bookingService.getSession(OPEN_EVENT_ID))).toEqual({
      kind: "api",
      code: "ACCESS_EXPIRED",
      status: 401,
    });
  });

  it("submit 409: error_code INSUFFICIENT_STOCK menjadi STOCK_INSUFFICIENT, 409 lain tetap BOOKING_REJECTED", async () => {
    const submit = () =>
      setupTestContainer().cradle.bookingService.submitBooking({
        eventId: OPEN_EVENT_ID,
        contactEmail: "rina@example.com",
        termsVersion: "v1",
        tickets: [{ categoryId: "cat_vip", nik: "3171000000000033" }],
      });
    const conflict = (errorCode?: string) =>
      http.post(`${MOCK_API_BASE_URL}/bookings`, () =>
        HttpResponse.json(
          { meta: { code: 409, message: "x", ...(errorCode ? { error_code: errorCode } : {}) } },
          { status: 409 },
        ),
      );

    server.use(conflict("INSUFFICIENT_STOCK"));
    expect(await failureOf(submit())).toEqual({ kind: "api", code: "STOCK_INSUFFICIENT", status: 409 });
    server.use(conflict("NIK_ALREADY_USED"));
    expect(await failureOf(submit())).toEqual({ kind: "api", code: "BOOKING_REJECTED", status: 409 });
    server.use(conflict());
    expect(await failureOf(submit())).toEqual({ kind: "api", code: "BOOKING_REJECTED", status: 409 });
  });
});

describe("orderService", () => {
  async function setupBooking() {
    const container = setupTestContainer();
    const token = await admitToQueue(container);
    const bookingId = await createBooking(token, container.cradle.credentialStore.deviceId());
    return { ...container.cradle, bookingId };
  }

  it("booking baru menunggu pemilihan metode", async () => {
    const { orderService, bookingId } = await setupBooking();
    const order = await orderService.getOrder(bookingId);
    expect(order).toMatchObject({
      bookingId,
      eventName: "Konser A",
      status: "PENDING_PAYMENT",
      totalIdr: 1_500_000,
      items: [{ category: "VIP", priceIdr: 1_500_000, nikMasked: "3171********xx22" }],
    });
    expect(order.instruction).toBeUndefined();
    expect(order.paymentTtl.ttlSeconds).toBeGreaterThan(0);
  });

  it("metode tersedia dipetakan ke camelCase", async () => {
    const { orderService, bookingId } = await setupBooking();
    const methods = await orderService.getAvailableMethods(bookingId);
    expect(methods.map((method) => method.id)).toEqual(["bank_transfer", "gopay"]);
    expect(methods[0]?.banks?.[0]).toEqual({ code: "bca", name: "BCA", iconUrl: "/icons/bca.svg" });
  });

  it("bank_transfer menghasilkan instruksi VA yang bertahan saat order di-poll ulang", async () => {
    const { orderService, bookingId } = await setupBooking();
    const order = await orderService.initiatePayment(bookingId, "bank_transfer", "bca");
    expect(order.status).toBe("AWAITING_PAYMENT");
    expect(order.instruction).toMatchObject({ type: "bank_transfer", bank: "bca" });
    expect((await orderService.getOrder(bookingId)).instruction).toEqual(order.instruction);
  });

  it("retry membatalkan pembayaran lalu memulai metode baru", async () => {
    const { orderService, bookingId } = await setupBooking();
    await orderService.initiatePayment(bookingId, "bank_transfer", "bni");
    const order = await orderService.retryPayment(bookingId, "gopay");
    expect(order.method).toBe("gopay");
    expect(order.instruction?.type).toBe("gopay");
  });

  it("pembayaran berhasil dari webhook: order PAID tanpa TTL", async () => {
    const { orderService, bookingId } = await setupBooking();
    await orderService.initiatePayment(bookingId, "gopay");
    await fetch(`${MOCK_API_BASE_URL}/payments/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(midtransCallback(bookingId, "settlement")),
    });
    expect(await orderService.getPaymentStatus(bookingId)).toMatchObject({ status: "PAID" });
    expect((await orderService.getOrder(bookingId)).status).toBe("PAID");
  });
});

describe("orderService: status akhir", () => {
  it("pembayaran gagal dari webhook: order FAILED dengan nomor percobaan", async () => {
    const container = setupTestContainer();
    const token = await admitToQueue(container);
    const bookingId = await createBooking(token, container.cradle.credentialStore.deviceId());
    const { orderService } = container.cradle;
    await orderService.initiatePayment(bookingId, "bank_transfer", "bri");
    await fetch(`${MOCK_API_BASE_URL}/payments/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(midtransCallback(bookingId, "deny")),
    });
    expect(await orderService.getOrder(bookingId)).toMatchObject({
      status: "FAILED",
      method: "bank_transfer",
      attempt: 1,
    });
  });

  it("status EXPIRED memakai waktu server sebagai waktu kedaluwarsa", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/payments/:id/status`, () =>
        envelope({ status: "EXPIRED", server_time: "2026-10-19T10:30:00Z" }),
      ),
    );
    const { orderService } = setupTestContainer().cradle;
    expect(await orderService.getPaymentStatus("RB-1")).toEqual({
      status: "EXPIRED",
      expiredAt: "2026-10-19T10:30:00Z",
    });
  });
});

describe("ticketService", () => {
  it("e-tiket lewat `?t=` dari email dipetakan ke model domain", async () => {
    const { ticketService } = setupTestContainer().cradle;
    const eticket = await ticketService.getETicket("TKT-001", "signed");
    expect(eticket).toMatchObject({
      id: "TKT-001",
      event: { id: "evt_konser_a", name: "Konser A", venue: "GBK, Jakarta" },
      category: "VIP",
      nik: "3171********xx22",
      status: "ISSUED",
    });
  });

  it("tiket saya butuh sesi akun: tamu mendapat UNAUTHENTICATED dari route same-origin", async () => {
    const { ticketService } = setupTestContainer().cradle;
    expect(await failureOf(ticketService.getMyTickets())).toEqual({
      kind: "api",
      code: "UNAUTHENTICATED",
      status: 401,
    });
  });

  it("daftar tiket: VALID menjadi ISSUED", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/users/me/tickets`, () =>
        envelope([
          {
            ticket_id: "TKT-9",
            booking_id: "RB-9",
            event: { id: "evt_konser_a", name: "Konser A", date: "2026-12-25", venue: "GBK" },
            category: "VIP",
            price: 1,
            status: "VALID",
            eticket_url: "/tickets/TKT-9/eticket",
          },
          {
            ticket_id: "TKT-10",
            booking_id: "RB-9",
            event: { id: "evt_konser_a", name: "Konser A", date: "2026-12-25", venue: "GBK" },
            category: "VIP",
            price: 1,
            status: "USED",
            eticket_url: "/tickets/TKT-10/eticket",
          },
        ]),
      ),
    );
    const { ticketService, authService } = setupTestContainer().cradle;
    await authService.verify("mt_tickets");
    const result = await ticketService.getMyTickets();
    expect(result.total).toBe(2);
    expect(result.tickets.map((ticket) => ticket.status)).toEqual(["ISSUED", "USED"]);
  });
});

describe("pemetaan /queue/me", () => {
  it.each([
    [
      { state: "AWAITING_PAYMENT", grant_token: "gt_x", payment_expires_at: "2026-10-19T10:20:00Z" },
      { status: "admitted", accessToken: "gt_x", expiresAt: "2026-10-19T10:20:00Z" },
    ],
    [
      { state: "CONFIRMED", booking_id: "RB-1" },
      { status: "ended", reason: "confirmed" },
    ],
    [{ state: "EXPIRED" }, { status: "ended", reason: "expired" }],
  ])("%o", async (data, expected) => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () => envelope(data)));
    const { queueService } = setupTestContainer().cradle;
    await queueService.join(OPEN_EVENT_ID);
    expect(await queueService.getOwnState(OPEN_EVENT_ID)).toMatchObject({
      eventName: "Konser A",
      ...expected,
    });
  });
});

describe("sessionService", () => {
  it("menyimpan grant untuk header dan mengirimnya ke route same-origin", async () => {
    let received: unknown;
    server.use(
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, async ({ request }) => {
        received = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { sessionService, credentialStore } = setupTestContainer().cradle;
    await sessionService.start("tok");
    expect(received).toEqual({ accessToken: "tok" });
    expect(credentialStore.grantToken()).toBe("tok");
  });

  it("gagal dari route menjadi unknown, gagal jaringan menjadi network", async () => {
    const { sessionService } = setupTestContainer().cradle;
    server.use(
      http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => new HttpResponse(null, { status: 500 })),
    );
    expect(await failureOf(sessionService.start("tok"))).toEqual({ kind: "unknown", status: 500 });

    server.use(http.post(`${TEST_APP_ORIGIN}/api/session/start`, () => HttpResponse.error()));
    expect(await failureOf(sessionService.start("tok"))).toEqual({ kind: "network" });
  });

  it("end membuang grant di klien dan meminta route menghapus cookie", async () => {
    let called = false;
    server.use(
      http.post(`${TEST_APP_ORIGIN}/api/session/end`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { sessionService, credentialStore } = setupTestContainer().cradle;
    credentialStore.saveGrantToken("tok");
    await sessionService.end();
    expect(called).toBe(true);
    expect(credentialStore.grantToken()).toBeNull();
  });

  it("end: gagal dari route menjadi unknown, gagal jaringan menjadi network", async () => {
    const { sessionService } = setupTestContainer().cradle;
    server.use(
      http.post(`${TEST_APP_ORIGIN}/api/session/end`, () => new HttpResponse(null, { status: 500 })),
    );
    expect(await failureOf(sessionService.end())).toEqual({ kind: "unknown", status: 500 });

    server.use(http.post(`${TEST_APP_ORIGIN}/api/session/end`, () => HttpResponse.error()));
    expect(await failureOf(sessionService.end())).toEqual({ kind: "network" });
  });
});

describe("queueUpdatesService", () => {
  async function watching() {
    const fakes = setupFakeEventSources();
    const container = setupTestContainer({ eventSourceFactory: asValue(fakes.factory) });
    const { queueUpdatesService, queueService } = container.cradle;
    await queueService.join(OPEN_EVENT_ID);
    const observer = { next: vi.fn(), connected: vi.fn(), disconnected: vi.fn() };
    const stop = queueUpdatesService.watch(OPEN_EVENT_ID, observer);
    const source = fakes.find("/queue/stream")!;
    return { source, observer, stop, queueService };
  }
  const tick = (nowServing: number, state = "OPEN") => ({
    nowServing,
    state,
    ratePerMin: 318,
    serverTime: "2026-10-24T13:10:00.000Z",
  });

  it("nowServing dari stream dihitung jadi posisi", async () => {
    const { source, observer } = await watching();
    expect(source.url).toBe(`${MOCK_API_BASE_URL}/events/${OPEN_EVENT_ID}/queue/stream`);
    source.emit("message", tick(32_648));
    expect(observer.next).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "waiting", position: 100, fullBooked: false, stale: false }),
    );
  });

  it("nowServing >= ticket_no mengambil token dari /queue/me tanpa event grant", async () => {
    const { source, observer, queueService } = await watching();
    // Join tidak memajukan antrian; dua /queue/me lagi sampai giliran (tiap panggilan memajukan antrian di mock).
    await queueService.getOwnState(OPEN_EVENT_ID);
    await queueService.getOwnState(OPEN_EVENT_ID);
    source.emit("message", tick(33_000));
    await vi.waitFor(() =>
      expect(observer.next).toHaveBeenLastCalledWith(expect.objectContaining({ status: "admitted" })),
    );
  });

  it("status FULL_BOOKED menandai stok habis dan OPEN memulihkannya, stream tetap terbuka", async () => {
    const { source, observer } = await watching();
    source.emit("message", tick(32_548));
    source.emit("status", {
      state: "FULL_BOOKED",
      fullBookedAt: "2026-10-24T13:40:12.000Z",
      serverTime: "x",
    });
    expect(observer.next).toHaveBeenLastCalledWith(
      expect.objectContaining({ fullBooked: true, position: 200 }),
    );
    source.emit("status", { state: "OPEN", serverTime: "x" });
    expect(observer.next).toHaveBeenLastCalledWith(expect.objectContaining({ fullBooked: false }));
    expect(source.closed).toBe(false);
  });

  it("stale meredupkan data tanpa menutup stream, pulih pada pesan berikutnya", async () => {
    const { source, observer } = await watching();
    source.emit("message", tick(32_548));
    source.emit("stale", {
      stale: true,
      state: "OPEN",
      message: "Data antrian belum diperbarui",
      serverTime: "x",
    });
    expect(observer.next).toHaveBeenLastCalledWith(expect.objectContaining({ stale: true, position: 200 }));
    expect(source.closed).toBe(false);
    source.emit("stale", { stale: false, state: "OPEN", serverTime: "x" });
    expect(observer.next).toHaveBeenLastCalledWith(expect.objectContaining({ stale: false }));
  });

  it("reconnect dilaporkan sebagai putus supaya controller memakai polling", async () => {
    const { source, observer } = await watching();
    source.emit("reconnect", { state: "OPEN", message: "Server sedang diperbarui", serverTime: "x" });
    expect(observer.disconnected).toHaveBeenCalled();
  });

  it("sold-out mengakhiri antrian", () => {
    const fakes = setupFakeEventSources();
    const { queueUpdatesService } = setupTestContainer({ eventSourceFactory: asValue(fakes.factory) }).cradle;
    const next = vi.fn();
    queueUpdatesService.watch(OPEN_EVENT_ID, { next, connected: vi.fn(), disconnected: vi.fn() });
    fakes
      .find("/queue/stream")!
      .emit("sold-out", { state: "CLOSED", message: "Tiket sudah habis", serverTime: "x" });
    expect(next).toHaveBeenCalledWith({ status: "ended", eventName: "", reason: "closed" });
  });

  it("payload yang tidak sesuai kontrak diabaikan", async () => {
    const { source, observer } = await watching();
    source.emit("message", { nowServing: "bukan angka" });
    expect(observer.next).not.toHaveBeenCalled();
  });
});

describe("savedNikService", () => {
  it("add mengirim POST berisi NIK dan label", async () => {
    let body: unknown;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/accounts/me/saved-niks`, async ({ request }) => {
        body = await request.json();
        return envelope({}, 201, "NIK saved");
      }),
    );
    const { savedNikService, authService } = setupTestContainer().cradle;
    await authService.verify("mt_alias");
    await savedNikService.add({ label: "Sari", nik: "3171000000000044" });
    expect(body).toEqual({ nik: "3171000000000044", label: "Sari" });
  });
});

describe("holderAliasService", () => {
  it("hanya alias dengan NIK lengkap yang bisa dipilih", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/accounts/me/saved-niks`, () =>
        envelope({
          max_entries: 5,
          saved_niks: [
            {
              id: "snk_1",
              nik: "3171000000000033",
              nik_masked: "3171****33",
              label: "Budi",
              name: " Budi Santoso ",
              verified_at: "x",
            },
            { id: "snk_2", nik_masked: "3171****44", label: "Sari", verified_at: "x" },
          ],
        }),
      ),
    );
    const { holderAliasService, authService } = setupTestContainer().cradle;
    await authService.verify("mt_aliases");
    expect(await holderAliasService.list()).toEqual([
      { id: "snk_1", label: "Budi", nik: "3171000000000033", nikMasked: "3171****33" },
    ]);
  });

  it("tamu: UNAUTHENTICATED dari route same-origin", async () => {
    const { holderAliasService } = setupTestContainer().cradle;
    expect(await failureOf(holderAliasService.list())).toEqual({
      kind: "api",
      code: "UNAUTHENTICATED",
      status: 401,
    });
  });
});

describe("ticketService.getETicket lewat sesi akun", () => {
  it("tanpa token email: lewat route same-origin dengan Bearer", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${MOCK_API_BASE_URL}/tickets/:id/eticket`, ({ request }) => {
        authorization = request.headers.get("authorization");
        return envelope({
          ticket_id: "TKT-7",
          event: { name: "Konser A", date: "2026-12-25", time: "19:00", venue: "GBK, Jakarta" },
          category: "VIP",
          holder: { nik_masked: "3171****22" },
          qr_code: "data:image/png;base64,AAAA",
          qr_value: "TKT-7|evt_konser_a|3171000000000022",
          instructions: "Bawa KTP.",
        });
      }),
    );
    const { ticketService, authService } = setupTestContainer().cradle;
    await authService.verify("mt_eticket");
    const eticket = await ticketService.getETicket("TKT-7");
    expect(authorization).toMatch(/^Bearer /);
    expect(eticket.event).toMatchObject({ id: "evt_konser_a", time: "19:00" });
  });

  it("tiket tidak ada: TICKET_NOT_FOUND", async () => {
    const { ticketService } = setupTestContainer().cradle;
    expect(await failureOf(ticketService.getETicket("TKT-404", "signed"))).toEqual({
      kind: "api",
      code: "TICKET_NOT_FOUND",
      status: 404,
    });
  });
});

describe("sessionAccountService", () => {
  it("tamu: null; setelah masuk: akun dari cookie sesi", async () => {
    const { sessionAccountService, authService } = setupTestContainer().cradle;
    expect(await sessionAccountService.current()).toBeNull();
    await authService.verify("mt_session");
    expect(await sessionAccountService.current()).toEqual({
      email: "you@example.com",
      nikMasked: "3171**********22",
      nik: "3171000000000022",
    });
  });
});
