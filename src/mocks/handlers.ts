import { http, HttpResponse, sse } from "msw";

export const MOCK_API_BASE_URL = "https://api.rusuh.test";

// Skenario bernama (ADR-0009). Pilih di browser dengan `?scenario=<nama>`.
export type Scenario = "queue-moving" | "queue-stuck" | "booking-expiring" | "payment-expiring";
export const DEFAULT_SCENARIO: Scenario = "queue-moving";

export function isScenario(value: string | null | undefined): value is Scenario {
  return (
    value === "queue-moving" ||
    value === "queue-stuck" ||
    value === "booking-expiring" ||
    value === "payment-expiring"
  );
}

const events = [
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

const eventNameOf = (eventId: string) =>
  events.find((event) => event.id === eventId)?.name ?? events[0]!.name;

type MockOrder = {
  expiresAt: number;
  status: "awaiting_method" | "pending" | "paid" | "failed" | "expired";
  method?: "virtual_account" | "e_wallet" | "bank_transfer";
  instruction?: ReturnType<typeof instructionFor>;
};

const instructionFor = (orderId: string, method: NonNullable<MockOrder["method"]>) => {
  if (method === "virtual_account")
    return { type: "virtual_account", bank: "BCA", number: "8277081234567890" };
  if (method === "e_wallet") return { type: "qr", payload: `rusuh-pay:${orderId}` };
  return { type: "bank_transfer", bank: "BCA", account: "1234567890", accountName: "PT Rusuh Booking Tiket" };
};

const isFinalStatus = (status: MockOrder["status"]) =>
  status === "paid" || status === "failed" || status === "expired";

const JOINED_POSITION = 1248;
const QUEUE_TICK_MS = 2000;
const POSITIONS_PER_MINUTE = 312;

const categories = [
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
  // Pelanggan stream order per orderId; dipanggil setiap status berubah (ADR-0016).
  const orderWatchers = new Map<string, Set<() => void>>();
  const publishOrder = (orderId: string) => orderWatchers.get(orderId)?.forEach((push) => push());

  // Setiap pembacaan (GET atau tick stream) memajukan antrian satu langkah.
  const nextQueueState = (eventId: string) => {
    orders.clear(); // antrian baru berarti order baru
    bookingExpiry.delete(eventId); // masuk antrian lagi berarti booking berikutnya mendapat TTL baru
    const polls = (pollCount.get(eventId) ?? 0) + 1;
    pollCount.set(eventId, polls);

    const position =
      scenario === "queue-stuck" ? JOINED_POSITION : Math.max(0, JOINED_POSITION - (polls - 1) * 416);
    if (position === 0) {
      return {
        status: "admitted" as const,
        eventName: eventNameOf(eventId),
        accessToken: "mock-access-token",
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      };
    }
    return {
      status: "waiting" as const,
      eventName: eventNameOf(eventId),
      position,
      joinedPosition: JOINED_POSITION,
      etaSeconds: Math.round((position * 60) / POSITIONS_PER_MINUTE),
      retryAfterSeconds: 2,
    };
  };

  const orderFor = (orderId: string): MockOrder => {
    const order = orders.get(orderId) ?? {
      expiresAt: Date.now() + paymentTtlMs,
      status: "awaiting_method" as const,
    };
    orders.set(orderId, order);
    // Server yang memutuskan kedaluwarsa (ADR-0005); hanya order yang belum selesai yang bisa expired.
    if ((order.status === "awaiting_method" || order.status === "pending") && Date.now() >= order.expiresAt)
      order.status = "expired";
    return order;
  };

  const orderBody = (orderId: string, order: MockOrder) => ({
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

  // MSW hanya bisa membuat handler SSE bila EventSource ada (browser). Node (test, mock sisi server Next)
  // tidak mengonsumsi stream, jadi cukup handler HTTP.
  const streamHandlers =
    typeof EventSource === "undefined"
      ? []
      : [
          // Server mengirim snapshot saat tersambung, lalu posisi baru tiap tick; ditutup setelah admitted.
          sse<{ queue: unknown }>(
            `${MOCK_API_BASE_URL}/events/:eventId/queue/stream`,
            ({ params, client, request }) => {
              const eventId = String(params.eventId);
              const push = () => {
                const state = nextQueueState(eventId);
                client.send({ event: "queue", data: state });
                if (state.status === "admitted") {
                  clearInterval(timer);
                  client.close();
                }
              };
              const timer = setInterval(push, QUEUE_TICK_MS);
              request.signal.addEventListener("abort", () => clearInterval(timer));
              push();
            },
          ),
          // Snapshot saat tersambung, lalu setiap perubahan status; ditutup di status akhir (ADR-0016).
          sse<{ order: unknown }>(
            `${MOCK_API_BASE_URL}/orders/:orderId/stream`,
            ({ params, client, request }) => {
              const orderId = String(params.orderId);
              const watchers = orderWatchers.get(orderId) ?? new Set();
              orderWatchers.set(orderId, watchers);
              const push = () => {
                const order = orderFor(orderId);
                client.send({ event: "order", data: orderBody(orderId, order) });
                if (isFinalStatus(order.status)) {
                  watchers.delete(push);
                  client.close();
                }
              };
              watchers.add(push);
              request.signal.addEventListener("abort", () => watchers.delete(push));
              push();
            },
          ),
        ];

  return [
    ...streamHandlers,
    http.get(`${MOCK_API_BASE_URL}/events`, () => HttpResponse.json({ events })),

    http.get(`${MOCK_API_BASE_URL}/events/:eventId/queue`, ({ params }) =>
      HttpResponse.json(nextQueueState(String(params.eventId))),
    ),

    http.get(`${MOCK_API_BASE_URL}/events/:eventId/booking-session`, ({ params }) => {
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

      return HttpResponse.json({
        eventName: eventNameOf(eventId),
        expiresAt: new Date(expiresAt).toISOString(),
        serverNow: new Date(now).toISOString(),
        maskedNik: "3171••••••••0001",
        quota: { max: 3, used: 0, remaining: 3 },
        categories,
      });
    }),

    http.get(`${MOCK_API_BASE_URL}/orders/:orderId`, ({ params }) => {
      const orderId = String(params.orderId);
      const order = orderFor(orderId);
      // Pembacaan bisa mengubah status menjadi expired; pelanggan stream ikut diberi tahu.
      publishOrder(orderId);
      return HttpResponse.json(orderBody(orderId, order));
    }),

    http.post(`${MOCK_API_BASE_URL}/orders/:orderId/payment`, async ({ params, request }) => {
      const orderId = String(params.orderId);
      const order = orderFor(orderId);
      const body = (await request.json().catch(() => null)) as { method?: string } | null;
      const method = body?.method;
      if (
        order.status === "awaiting_method" &&
        (method === "virtual_account" || method === "e_wallet" || method === "bank_transfer")
      ) {
        order.status = "pending";
        order.method = method;
        order.instruction = instructionFor(orderId, method);
        publishOrder(orderId);
      }
      return HttpResponse.json(orderBody(orderId, order));
    }),

    // Hanya mock: menggantikan notifikasi Midtrans ke BE.
    http.post(`${MOCK_API_BASE_URL}/mock/orders/:orderId/outcome`, async ({ params, request }) => {
      const orderId = String(params.orderId);
      const order = orderFor(orderId);
      const body = (await request.json().catch(() => null)) as { outcome?: string } | null;
      if (order.status === "pending") {
        order.status = body?.outcome === "success" ? "paid" : "failed";
        publishOrder(orderId);
      }
      return HttpResponse.json(orderBody(orderId, order));
    }),
  ];
}
