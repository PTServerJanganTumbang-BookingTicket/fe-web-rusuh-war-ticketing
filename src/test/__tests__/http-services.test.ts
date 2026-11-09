// Service HTTP di `data/` diuji terhadap MSW, di-resolve dari container yang sama dengan produksi.
import { describe, expect, it, vi } from "vitest";
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
  it("join dengan X-Device-Id lalu memetakan QUEUED ke waiting", async () => {
    const container = setupTestContainer();
    let deviceId: string | null = null;
    server.events.on("request:start", ({ request }) => {
      if (request.url.endsWith("/queue/join")) deviceId = request.headers.get("x-device-id");
    });
    expect(await container.cradle.queueService.getState(OPEN_EVENT_ID)).toEqual({
      status: "waiting",
      eventName: "Konser A",
      position: 832,
      joinedPosition: 1248,
      // 832 posisi x 60 / 318 per menit (laju dari /queue/serving).
      etaSeconds: 157,
      retryAfterMs: 5000,
    });
    server.events.removeAllListeners();
    expect(deviceId).toBe(container.cradle.credentialStore.deviceId());
  });

  it("memetakan GRANTED ke admitted dengan grant token", async () => {
    const container = setupTestContainer();
    const token = await admitToQueue(container);
    expect(token).toMatch(/^gt_/);
    expect(container.cradle.credentialStore.grantToken()).toBe(token);
  });

  it("join hanya sekali per event; poll berikutnya hanya /queue/me", async () => {
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
    expect(await failureOf(queueService.getState("evt_konser_b"))).toEqual({
      kind: "api",
      code: "QUEUE_FULL",
      status: 503,
    });
  });

  it("join mengirim captcha_token dari konfigurasi CAPTCHA event", async () => {
    const { queueService } = setupTestContainer().cradle;
    let body: unknown;
    server.events.on("request:start", async ({ request }) => {
      if (request.url.endsWith("/queue/join")) body = await request.clone().json();
    });
    await queueService.getState(OPEN_EVENT_ID);
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
    expect(await queueService.getState(OPEN_EVENT_ID)).toMatchObject({ status: "waiting", position: 5 });
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
    expect(await failureOf(queueService.getState(OPEN_EVENT_ID))).toEqual({ kind: "api", code, status });
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
    expect(await queueService.getState(OPEN_EVENT_ID)).toMatchObject({
      status: "admitted",
      accessToken: "gt_abc123",
    });
  });

  it("laju antrian tidak tersedia: join tetap berhasil, ETA 0", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/queue/serving`, () => envelope({}, 503, "down")));
    const { queueService } = setupTestContainer().cradle;
    expect(await queueService.getState(OPEN_EVENT_ID)).toMatchObject({ status: "waiting", etaSeconds: 0 });
  });

  it("401 dari /queue/me menjadi QUEUE_TOKEN_INVALID", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/events/:id/queue/me`, () => envelope({}, 401, "Unauthorized")));
    const { queueService } = setupTestContainer().cradle;
    expect(await failureOf(queueService.getState(OPEN_EVENT_ID))).toEqual({
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
    expect(await queueService.getState(OPEN_EVENT_ID)).toMatchObject({ eventName: "Konser A", ...expected });
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
});

describe("queueUpdatesService", () => {
  it("now_serving dari stream dihitung jadi posisi, `grant` mengambil token dari /queue/me", async () => {
    const fakes = setupFakeEventSources();
    const container = setupTestContainer({ eventSourceFactory: asValue(fakes.factory) });
    const { queueUpdatesService, queueService } = container.cradle;
    await queueService.getState(OPEN_EVENT_ID);
    const next = vi.fn();
    queueUpdatesService.watch(OPEN_EVENT_ID, { next, connected: vi.fn(), disconnected: vi.fn() });
    const source = fakes.find("/queue/stream")!;
    expect(source.url).toBe(`${MOCK_API_BASE_URL}/events/${OPEN_EVENT_ID}/queue/stream`);

    source.emit("message", { nowServing: 32_648 });
    expect(next).toHaveBeenLastCalledWith(expect.objectContaining({ status: "waiting", position: 100 }));

    // Dua poll lagi sampai giliran; `grant` memicu panggilan /queue/me yang memajukan antrian.
    await queueService.getState(OPEN_EVENT_ID);
    source.emit("grant", {});
    await vi.waitFor(() =>
      expect(next).toHaveBeenLastCalledWith(expect.objectContaining({ status: "admitted" })),
    );
  });

  it("sold-out mengakhiri antrian", () => {
    const fakes = setupFakeEventSources();
    const { queueUpdatesService } = setupTestContainer({ eventSourceFactory: asValue(fakes.factory) }).cradle;
    const next = vi.fn();
    queueUpdatesService.watch(OPEN_EVENT_ID, { next, connected: vi.fn(), disconnected: vi.fn() });
    fakes.find("/queue/stream")!.emit("sold-out", { message: "Penjualan sudah ditutup" });
    expect(next).toHaveBeenCalledWith({ status: "ended", eventName: "", reason: "closed" });
  });
});

describe("savedNikService dan profileService", () => {
  it("update mengirim PATCH berisi label dan nama, dan NIK hanya bila diganti", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.patch(`${MOCK_API_BASE_URL}/accounts/me/saved-niks/:id`, async ({ request, params }) => {
        bodies.push({ id: params.id, body: await request.json() });
        return envelope({});
      }),
    );
    const { savedNikService, authService } = setupTestContainer().cradle;
    await authService.verify("mt_alias");
    await savedNikService.update("snk_1", { label: "Budi", nik: "" });
    await savedNikService.update("snk_1", { label: "Budi", nik: "3171000000000044" });
    expect(bodies).toEqual([
      { id: "snk_1", body: { label: "Budi" } },
      { id: "snk_1", body: { label: "Budi", nik: "3171000000000044" } },
    ]);
  });

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

  it("update: NIK sudah tersimpan di alias lain menjadi SAVED_NIK_REJECTED", async () => {
    server.use(
      http.patch(`${MOCK_API_BASE_URL}/accounts/me/saved-niks/:id`, () =>
        envelope({}, 409, "NIK already saved"),
      ),
    );
    const { savedNikService, authService } = setupTestContainer().cradle;
    await authService.verify("mt_alias");
    expect(await failureOf(savedNikService.update("snk_1", { label: "B", nik: "3171000000000044" }))).toEqual(
      {
        kind: "api",
        code: "SAVED_NIK_REJECTED",
        status: 409,
      },
    );
  });

  it("profil dari GET /accounts/me dipetakan ke model domain", async () => {
    const { profileService, authService } = setupTestContainer().cradle;
    await authService.verify("mt_profile");
    expect(await profileService.get()).toEqual({
      name: "JOHN DOE",
      email: "you@example.com",
      nikMasked: "3171********xx22",
      memberSince: "2026-10-01T09:00:00Z",
    });
  });

  it("profil tanpa sesi: UNAUTHENTICATED", async () => {
    const { profileService } = setupTestContainer().cradle;
    expect(await failureOf(profileService.get())).toEqual({
      kind: "api",
      code: "UNAUTHENTICATED",
      status: 401,
    });
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
      nikMasked: "3171********xx22",
    });
  });
});
