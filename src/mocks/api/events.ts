import { http, sse } from "msw";
import { fail, hasBearer, iso, ok, paginate } from "./envelope";
import { QUEUE_CAPACITY, type MockEvent } from "./fixtures";
import type { MockState } from "./state";

const RATE_PER_MIN = 318;
const POLL_AFTER_MS = 5_000;
const QUEUE_TICK_MS = 2_000;
const MAX_STREAM_TICKS = 15;

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
          // Event tanpa nama membawa now_serving; `grant` hanya memberi tahu, token diambil dari /queue/me.
          sse<{ message: unknown; grant: unknown; "sold-out": unknown }>(
            `${baseUrl}/events/:eventId/queue/stream`,
            ({ params, client, request, cookies }) => {
              const eventId = String(params.eventId);
              const event = state.findEvent(eventId);
              const entry = findEntry(state, eventId, request, cookies);
              const push = () => {
                if (!event || event.status === "SOLD_OUT") {
                  client.send({ event: "sold-out", data: { message: "Penjualan sudah ditutup" } });
                  stop();
                  return;
                }
                const serving = state.advanceServing(eventId);
                client.send({
                  id: String(serving),
                  data: {
                    nowServing: serving,
                    state: event.queueState,
                    ratePerMin: RATE_PER_MIN,
                    paused: false,
                    serverTime: new Date().toISOString(),
                  },
                });
                if (entry && (entry.grantToken || serving >= entry.ticketNo)) {
                  client.send({ event: "grant", data: {} });
                  stop();
                }
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
    http.post(`${baseUrl}/events/:eventId/queue/join`, ({ params, request, cookies }) => {
      const event = state.findEvent(String(params.eventId));
      if (!event) return fail(404, "Event not found");
      const deviceId = request.headers.get("x-device-id");
      if (!deviceId && !hasBearer(request)) return fail(400, "DEVICE_ID_REQUIRED");
      if (event.queueState === "FULL")
        return fail(503, "Antrian sedang penuh", { queue_state: "FULL", queue_capacity: QUEUE_CAPACITY });
      if (event.queueState === "NOT_OPEN") return fail(409, "Antrian belum dibuka");

      const entry = findEntry(state, event.id, request, cookies) ?? state.joinQueue(event.id, deviceId);
      const serving = state.servingOf(event.id);
      const position = Math.max(entry.ticketNo - serving, 0);
      const response = ok(
        {
          ticket_no: entry.ticketNo,
          now_serving: serving,
          position,
          estimated_wait_minutes: Math.ceil(position / RATE_PER_MIN),
          sse_url: `/events/${event.id}/queue/stream`,
          event: { id: event.id, name: event.name },
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
        now_serving: state.advanceServing(eventId),
        rate_per_min: RATE_PER_MIN,
        paused: false,
        server_time: new Date().toISOString(),
        poll_after_ms: POLL_AFTER_MS,
      });
    }),
  ];
}
