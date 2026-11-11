import { http, sse } from "msw";
import { fail, field, hasBearer, iso, ok, paginate, readJson } from "./envelope";
import { QUEUE_CAPACITY, type MockEvent } from "./fixtures";
import type { MockState } from "./state";

const RATE_PER_MIN = 318;
const POLL_AFTER_MS = 5_000;
const QUEUE_TICK_MS = 2_000;
const MAX_STREAM_TICKS = 15;

/** Kunci uji Cloudflare Turnstile (selalu lolos). Mode mock tidak memuat skrip Turnstile. */
const CAPTCHA = { provider: "turnstile", site_key: "1x00000000000000000000BB" };
/** Token yang ditolak mock dengan 403 CAPTCHA_FAILED, untuk menguji jalur gagal. */
export const FAILING_CAPTCHA_TOKEN = "captcha-fail";

/** Batas poll antrian berdasarkan jarak ke giliran (kontrak: poll_tiers). */
const POLL_TIERS = [
  { max_position: 10, poll_after_ms: 1_000 },
  { max_position: 100, poll_after_ms: 2_000 },
  { max_position: 1_000, poll_after_ms: 5_000 },
  { max_position: null, poll_after_ms: 10_000 },
];

const saleState = (event: MockEvent) => {
  if (event.status === "SOLD_OUT") return "CLOSED";
  return event.queueState === "NOT_OPEN" ? "SCHEDULED" : "OPEN";
};

function eventBase(event: MockEvent) {
  return {
    id: event.id,
    name: event.name,
    category: event.category,
    location: { venue: event.venue, city: event.city },
    date: event.date,
    image_url: event.imageUrl,
    status: event.status,
    queue_state: event.queueState,
    queue_depth: event.queueDepth,
    queue_capacity: QUEUE_CAPACITY,
    sale_starts_at: event.saleStartsAt,
    display: {
      enabled: event.display.enabled,
      action: event.display.action,
      label_key: event.display.labelKey,
      badge_key: event.display.badgeKey,
    },
  };
}

function eventSummary(event: MockEvent) {
  const prices = event.categories.map((category) => category.price);
  return { ...eventBase(event), min_price: Math.min(...prices), max_price: Math.max(...prices) };
}

function eventDetail(event: MockEvent) {
  return {
    ...eventBase(event),
    time: event.time,
    description: event.description,
    captcha: CAPTCHA,
    ticket_categories: event.categories.map((category) => ({
      ...category,
      status: category.available > 0 ? "AVAILABLE" : "SOLD_OUT",
    })),
  };
}

const FILTERS: Record<string, (event: MockEvent) => boolean> = {
  all: () => true,
  available: (event) =>
    event.status !== "SOLD_OUT" && (event.queueState === "OPEN" || event.queueState === "DIRECT"),
  upcoming: (event) => event.queueState === "NOT_OPEN",
};

/**
 * Customer dikenali dari cookie `queue_token` (web) atau X-Queue-Token (mobile).
 * Customer login tanpa token dipulihkan lewat Bearer ke tiket terakhirnya (pemulihan lintas perangkat).
 */
function findEntry(state: MockState, eventId: string, request: Request, cookies: Record<string, string>) {
  const jar = request.credentials !== "omit" ? state.cookieJar.get("queue_token") : undefined;
  const token = cookies.queue_token ?? request.headers.get("x-queue-token") ?? jar;
  const entry = token ? state.queue.get(token) : undefined;
  if (entry?.eventId === eventId) return entry;
  if (!hasBearer(request)) return undefined;
  return [...state.queue.values()].reverse().find((item) => item.eventId === eventId);
}

/** Tag Events dan Queue. */
export function eventHandlers(state: MockState, baseUrl: string) {
  const queueStream =
    typeof EventSource === "undefined"
      ? []
      : [
          // Bentuk v2.12: pesan tanpa nama membawa nowServing, state, ratePerMin, serverTime. Tidak ada event `grant`;
          // klien memanggil /queue/me saat nowServing >= ticket_no.
          sse<{ message: unknown; status: unknown; stale: unknown; "sold-out": unknown; reconnect: unknown }>(
            `${baseUrl}/events/:eventId/queue/stream`,
            ({ params, client, request, cookies }) => {
              const eventId = String(params.eventId);
              const event = state.findEvent(eventId);
              const push = () => {
                // Join bisa selesai setelah stream terbuka, jadi tiket dicari ulang tiap tick.
                const entry = findEntry(state, eventId, request, cookies);
                if (!event || event.status === "SOLD_OUT") {
                  client.send({
                    event: "sold-out",
                    data: {
                      state: "CLOSED",
                      message: "Tiket sudah habis",
                      serverTime: new Date().toISOString(),
                    },
                  });
                  stop();
                  return;
                }
                const serving = state.advanceServing(eventId);
                try {
                  client.send({
                    id: String(serving),
                    data: {
                      nowServing: serving,
                      state: saleState(event),
                      ratePerMin: state.isQueueMoving() ? RATE_PER_MIN : 0,
                      serverTime: new Date().toISOString(),
                    },
                  });
                } catch {
                  // Klien sudah menutup stream (masuk setelah giliran tiba); MSW di browser tidak memberi abort.
                  stop();
                  return;
                }
                // Pesan ini yang membuat klien memanggil /queue/me; stream ditutup di sini sebelum klien menutupnya sendiri.
                if (entry && (entry.grantToken || serving >= entry.ticketNo)) stop();
              };
              function stop() {
                clearInterval(timer);
                client.close();
              }
              // Di browser, EventSource yang ditutup klien tidak memicu abort dan MSW menelan error kirim,
              // jadi umur stream dibatasi; EventSource tersambung ulang sendiri bila masih dibutuhkan.
              let ticks = 0;
              const tick = () => {
                ticks += 1;
                if (ticks > MAX_STREAM_TICKS) stop();
                else push();
              };
              const timer = setInterval(tick, QUEUE_TICK_MS);
              request.signal.addEventListener("abort", () => clearInterval(timer));
              tick();
            },
          ),
        ];

  return [
    ...queueStream,

    http.get(`${baseUrl}/events`, ({ request }) => {
      const url = new URL(request.url);
      const matches = FILTERS[url.searchParams.get("filter") ?? "all"] ?? FILTERS.all!;
      const { page, pagination } = paginate(state.events.filter(matches), url);
      return ok(page.map(eventSummary), { pagination });
    }),

    http.get(`${baseUrl}/events/:eventId`, ({ params }) => {
      const event = state.findEvent(String(params.eventId));
      if (!event) return fail(404, "Event not found");
      return ok(eventDetail(event));
    }),

    // Join ulang dengan token yang sama mengembalikan tiket yang sudah ada (re-entrancy).
    http.post(`${baseUrl}/events/:eventId/queue/join`, async ({ params, request, cookies }) => {
      const event = state.findEvent(String(params.eventId));
      if (!event) return fail(404, "Event not found");
      const deviceId = request.headers.get("x-device-id");
      if (!deviceId && !hasBearer(request)) return fail(400, "DEVICE_ID_REQUIRED", {}, "DEVICE_ID_REQUIRED");
      const captchaToken = field(await readJson(request), "captcha_token");
      if (typeof captchaToken !== "string" || captchaToken === "")
        return fail(400, "captcha_token is required", {}, "CAPTCHA_REQUIRED");
      if (captchaToken === FAILING_CAPTCHA_TOKEN) return fail(403, "CAPTCHA failed", {}, "CAPTCHA_FAILED");
      if (event.queueState === "FULL")
        return fail(
          503,
          "Antrian sedang penuh",
          { queue_state: "FULL", queue_capacity: QUEUE_CAPACITY },
          "QUEUE_FULL",
        );
      if (event.queueState === "NOT_OPEN")
        return fail(
          409,
          "Antrian belum dibuka",
          { queue_state: "NOT_OPEN", sale_starts_at: event.saleStartsAt },
          "SALE_NOT_OPEN",
        );

      const existing = findEntry(state, event.id, request, cookies);
      const entry = existing ?? state.joinQueue(event.id, deviceId);
      const serving = state.servingOf(event.id);
      const position = Math.max(entry.ticketNo - serving, 0);
      const response = ok(
        {
          ticket_no: entry.ticketNo,
          now_serving: serving,
          position,
          queue_token: entry.token,
          sse_url: `/events/${event.id}/queue/stream`,
          event: { id: event.id, name: event.name },
          ...(existing ? { rejoined: true, state: "QUEUED" } : {}),
        },
        { message: "Successfully joined queue" },
      );
      response.headers.set("Set-Cookie", `queue_token=${entry.token}; Path=/; SameSite=Lax`);
      if (request.credentials !== "omit") state.cookieJar.set("queue_token", entry.token);
      return response;
    }),

    // Setiap panggilan memajukan antrian satu langkah, sama seperti tick SSE.
    http.get(`${baseUrl}/events/:eventId/queue/me`, ({ params, request, cookies }) => {
      const eventId = String(params.eventId);
      const entry = findEntry(state, eventId, request, cookies);
      if (!entry) return fail(401, "Unauthorized");
      const now = Date.now();
      if (!entry.grantToken) state.advanceServing(eventId);
      const grant = state.grantIfDue(entry, now);
      if (!grant)
        return ok({ state: "QUEUED", ticket_no: entry.ticketNo, now_serving: state.servingOf(eventId) });

      const booking = [...state.bookings.values()].find((item) => item.grantToken === grant.token);
      if (!booking) {
        if (now >= grant.expiresAt) return ok({ state: "EXPIRED" });
        return ok({
          state: "GRANTED",
          grant_token: grant.token,
          booking_expires_at: iso(grant.expiresAt),
          server_time: iso(now),
        });
      }
      state.refreshBooking(booking, now);
      if (booking.status === "PAID") return ok({ state: "CONFIRMED", booking_id: booking.id });
      if (booking.status === "EXPIRED") return ok({ state: "EXPIRED" });
      return ok({
        state: "AWAITING_PAYMENT",
        grant_token: grant.token,
        booking_id: booking.id,
        payment_expires_at: iso(booking.paymentExpiresAt),
        payment_ref: booking.payment?.id ?? null,
        server_time: iso(now),
      });
    }),

    http.get(`${baseUrl}/events/:eventId/queue/serving`, ({ params }) => {
      const eventId = String(params.eventId);
      if (!state.findEvent(eventId)) return fail(404, "Event not found");
      return ok({
        now_serving: state.servingOf(eventId),
        rate_per_min: state.isQueueMoving() ? RATE_PER_MIN : 0,
        state: saleState(state.findEvent(eventId)!),
        poll_tiers: POLL_TIERS,
        paused: false,
        server_time: new Date().toISOString(),
        poll_after_ms: POLL_AFTER_MS,
      });
    }),
  ];
}
