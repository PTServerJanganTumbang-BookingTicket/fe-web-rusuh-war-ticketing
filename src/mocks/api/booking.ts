import { http } from "msw";
import { fail, field, iso, ok, readJson, ttlSeconds } from "./envelope";
import { isNikFormat, lookupNik, MAX_TICKETS_PER_ORDER, maskNik } from "./fixtures";
import type { BookedTicket, Booking, Grant, MockState } from "./state";

/**
 * Header X-Grant-Token wajib di semua endpoint booking dan payment. Grant tamu terikat X-Device-Id.
 * `checkExpiry` hanya untuk memilih tiket dan membuat booking; setelah booking dibuat, TTL pembayaran yang berlaku.
 */
export function requireGrant(state: MockState, request: Request, { checkExpiry }: { checkExpiry: boolean }) {
  const grant = state.grants.get(request.headers.get("x-grant-token") ?? "");
  if (!grant) return fail(401, "Grant token invalid");
  if (grant.deviceId && grant.deviceId !== request.headers.get("x-device-id"))
    return fail(401, "DEVICE_MISMATCH");
  if (checkExpiry && Date.now() >= grant.expiresAt) return fail(401, "Grant expired");
  return grant;
}

/** Booking hanya bisa dibaca lewat grant yang membuatnya. */
export function requireBooking(state: MockState, grant: Grant, bookingId: string) {
  const booking = state.bookings.get(bookingId);
  if (!booking || booking.grantToken !== grant.token) return fail(404, "Booking not found");
  return state.refreshBooking(booking, Date.now());
}

const eventInfo = (state: MockState, booking: Booking) => {
  const event = state.findEvent(booking.eventId);
  return {
    id: booking.eventId,
    name: event?.name ?? "",
    date: event?.date ?? "",
    venue: event ? `${event.venue}, ${event.city}` : "",
    image_url: event?.imageUrl ?? "",
  };
};

const issuedTicket = (ticket: BookedTicket) => ({
  ticket_id: ticket.ticketId,
  category: ticket.category,
  price: ticket.price,
  nik_masked: maskNik(ticket.nik),
  eticket_url: `/tickets/${ticket.ticketId}/eticket`,
});

const total = (booking: Booking) => booking.tickets.reduce((sum, ticket) => sum + ticket.price, 0);

export function bookingBody(state: MockState, booking: Booking, now: number) {
  if (booking.status === "PAID")
    return {
      booking_id: booking.id,
      status: "PAID",
      event: eventInfo(state, booking),
      tickets: booking.tickets.map(issuedTicket),
      summary: { quantity: booking.tickets.length, total: total(booking) },
      paid_at: iso(booking.paidAt ?? now),
      payment_method: booking.paidWith === "gopay" ? "GoPay" : "Virtual Account",
    };
  return {
    booking_id: booking.id,
    status: booking.status,
    event: eventInfo(state, booking),
    tickets: booking.tickets.map((ticket) => ({
      category: ticket.category,
      price: ticket.price,
      nik_masked: maskNik(ticket.nik),
    })),
    summary: {
      quantity: booking.tickets.length,
      price_per_ticket: booking.tickets[0]?.price ?? 0,
      total: total(booking),
    },
    payment_ttl: {
      expires_at: iso(booking.paymentExpiresAt),
      ttl_seconds: ttlSeconds(booking.paymentExpiresAt, now),
      server_time: iso(now),
    },
  };
}

type TicketRequest = { categoryId: string; nik: string; holderEmail: string };

function parseTickets(body: unknown): TicketRequest[] | null {
  const tickets = field(body, "tickets");
  if (!Array.isArray(tickets)) return null;
  const parsed = tickets.map((ticket: unknown) => ({
    categoryId: field(ticket, "category_id"),
    nik: field(ticket, "nik"),
    holderEmail: field(ticket, "holder_email"),
  }));
  const valid = parsed.every(
    (ticket): ticket is TicketRequest =>
      typeof ticket.categoryId === "string" &&
      isNikFormat(ticket.nik) &&
      typeof ticket.holderEmail === "string",
  );
  return valid ? (parsed as TicketRequest[]) : null;
}

/** Tag Booking dan NIK. */
export function bookingHandlers(state: MockState, baseUrl: string) {
  return [
    http.get(`${baseUrl}/events/:eventId/tickets`, ({ params, request }) => {
      const grant = requireGrant(state, request, { checkExpiry: true });
      if (grant instanceof Response) return grant;
      const event = state.findEvent(String(params.eventId));
      if (!event || grant.eventId !== event.id) return fail(401, "Grant is not valid for this event");
      const now = Date.now();
      return ok({
        event: {
          id: event.id,
          name: event.name,
          date: event.date,
          venue: `${event.venue}, ${event.city}`,
          image_url: event.imageUrl,
        },
        session: {
          expires_at: iso(grant.expiresAt),
          ttl_seconds: ttlSeconds(grant.expiresAt, now),
          server_time: iso(now),
        },
        categories: event.categories.map((category) => ({
          ...category,
          max_per_order: category.available > 0 ? Math.min(MAX_TICKETS_PER_ORDER, category.available) : 0,
        })),
        rules: { max_tickets_per_order: MAX_TICKETS_PER_ORDER, one_nik_per_ticket: true },
      });
    }),

    // Fail-closed: NIK tidak dikenal atau nonaktif tidak lolos (BR-02).
    http.post(`${baseUrl}/nik/validate`, async ({ request }) => {
      const grant = requireGrant(state, request, { checkExpiry: true });
      if (grant instanceof Response) return grant;
      const nik = field(await readJson(request), "nik");
      if (!isNikFormat(nik)) return fail(400, "NIK must be exactly 16 digits");
      const person = lookupNik(nik);
      if (!person) return ok({ nik, valid: false, reason: "NIK_NOT_FOUND" }, { message: "NIK not found" });
      if (person.status !== "ACTIVE")
        return ok({ nik, valid: false, reason: "NIK_INACTIVE" }, { message: "NIK inactive" });
      if (state.usedNiks.has(`${grant.eventId}:${nik}`))
        return ok(
          { nik, valid: true, already_used: true, reason: "NIK_ALREADY_USED" },
          { message: "NIK already used" },
        );
      return ok(
        { nik, valid: true, name: person.name, status: person.status, source: "verified" },
        { message: "NIK is valid" },
      );
    }),

    // Hold atomik, semua atau tidak sama sekali.
    http.post(`${baseUrl}/bookings`, async ({ request }) => {
      const grant = requireGrant(state, request, { checkExpiry: true });
      if (grant instanceof Response) return grant;
      const body = await readJson(request);
      const tickets = parseTickets(body);
      const contactEmail = field(body, "contact_email");
      const event = state.findEvent(String(field(body, "event_id")));
      if (!event || event.id !== grant.eventId) return fail(400, "event_id does not match grant");
      if (!tickets || tickets.length === 0 || typeof contactEmail !== "string")
        return fail(400, "tickets and contact_email are required");
      if (tickets.length > MAX_TICKETS_PER_ORDER)
        return fail(400, `Maximum ${MAX_TICKETS_PER_ORDER} tickets per order`);
      if (new Set(tickets.map((ticket) => ticket.nik)).size !== tickets.length)
        return fail(400, "Duplicate NIK in request");
      if (
        [...state.bookings.values()].some(
          (item) => item.grantToken === grant.token && item.status !== "EXPIRED",
        )
      )
        return fail(409, "Booking already exists for this grant");
      if (tickets.some((ticket) => lookupNik(ticket.nik)?.status !== "ACTIVE"))
        return fail(400, "NIK not found or inactive");
      if (tickets.some((ticket) => state.usedNiks.has(`${event.id}:${ticket.nik}`)))
        return fail(409, "NIK sudah digunakan untuk event ini");

      const wanted = new Map<string, number>();
      for (const ticket of tickets) wanted.set(ticket.categoryId, (wanted.get(ticket.categoryId) ?? 0) + 1);
      for (const [categoryId, quantity] of wanted) {
        const category = event.categories.find((item) => item.id === categoryId);
        if (!category) return fail(400, `Unknown category ${categoryId}`);
        if (category.available < quantity) return fail(409, "Stok tidak mencukupi");
      }

      const now = Date.now();
      const booking: Booking = {
        id: `RB-${String(912 + state.bookings.size).padStart(5, "0")}`,
        eventId: event.id,
        grantToken: grant.token,
        status: "PENDING_PAYMENT",
        tickets: tickets.map((ticket) => {
          const category = event.categories.find((item) => item.id === ticket.categoryId)!;
          category.available -= 1;
          state.usedNiks.add(`${event.id}:${ticket.nik}`);
          return {
            ticketId: null,
            categoryId: category.id,
            category: category.name,
            price: category.price,
            nik: ticket.nik,
            holderName: lookupNik(ticket.nik)?.name ?? "",
            holderEmail: ticket.holderEmail,
          };
        }),
        contactEmail,
        paymentExpiresAt: now + state.config.paymentTtlMs,
        attempt: 1,
        payment: null,
        paidAt: null,
        paidWith: null,
      };
      state.bookings.set(booking.id, booking);

      const { id, name, date, venue } = eventInfo(state, booking);
      return ok(
        {
          booking_id: booking.id,
          status: booking.status,
          event: { id, name, date, venue },
          tickets: booking.tickets.map((ticket) => ({
            category: ticket.category,
            price: ticket.price,
            nik_masked: maskNik(ticket.nik),
            holder_name: ticket.holderName,
          })),
          summary: { subtotal: total(booking), service_fee: 0, total: total(booking) },
          payment_ttl: {
            expires_at: iso(booking.paymentExpiresAt),
            ttl_seconds: ttlSeconds(booking.paymentExpiresAt, now),
            server_time: iso(now),
          },
          redirect_url: `/bookings/${booking.id}/payment`,
        },
        { status: 201, message: "Booking created successfully" },
      );
    }),

    http.get(`${baseUrl}/bookings/:bookingId`, ({ params, request }) => {
      const grant = requireGrant(state, request, { checkExpiry: false });
      if (grant instanceof Response) return grant;
      const booking = requireBooking(state, grant, String(params.bookingId));
      if (booking instanceof Response) return booking;
      return ok(bookingBody(state, booking, Date.now()));
    }),

    http.get(`${baseUrl}/bookings/:bookingId/tickets`, ({ params, request }) => {
      const grant = requireGrant(state, request, { checkExpiry: false });
      if (grant instanceof Response) return grant;
      const booking = requireBooking(state, grant, String(params.bookingId));
      if (booking instanceof Response) return booking;
      return ok(booking.status === "PAID" ? booking.tickets.map(issuedTicket) : []);
    }),
  ];
}
