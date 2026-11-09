import { http } from "msw";
import { fail, field, hasBearer, iso, ok, paginate, readJson, ttlSeconds } from "./envelope";
import { requireBooking, requireGrant } from "./booking";
import { maskNik } from "./fixtures";
import type { Booking, MockState } from "./state";

const BANKS = [
  { code: "bca", name: "BCA" },
  { code: "bni", name: "BNI" },
  { code: "bri", name: "BRI" },
  { code: "cimb", name: "CIMB Niaga" },
];

const VA_PREFIX: Record<string, string> = { bca: "8801", bni: "8808", bri: "8812", cimb: "8899" };

function instructions(booking: Booking) {
  const payment = booking.payment!;
  if (payment.method === "gopay")
    return {
      qr_url: `https://api.sandbox.midtrans.test/v2/gopay/${payment.id}/qr-code`,
      deeplink_url: `https://gojek.link/gopay/merchanttransfer?tref=${payment.id}`,
    };
  const digits = booking.id.replace(/\D/g, "").padStart(9, "0");
  return { bank: payment.bank, va_number: `${VA_PREFIX[payment.bank ?? "bca"]}${digits}` };
}

function statusBody(booking: Booking, now: number) {
  if (booking.status === "PAID")
    return {
      status: "PAID",
      paid_at: iso(booking.paidAt ?? now),
      redirect_url: `/bookings/${booking.id}/success`,
    };
  if (booking.status === "EXPIRED") return { status: "EXPIRED", server_time: iso(now) };
  if (booking.payment?.status === "FAILED")
    return {
      status: "FAILED",
      reason: booking.payment.failureReason,
      can_retry: true,
      attempt: booking.attempt,
      payment_expires_at: iso(booking.paymentExpiresAt),
      server_time: iso(now),
    };
  return { status: "PENDING", server_time: iso(now), ttl_seconds: ttlSeconds(booking.paymentExpiresAt, now) };
}

const STATUS_MESSAGE: Record<string, string> = {
  PAID: "Payment successful",
  FAILED: "Payment failed",
  EXPIRED: "Payment expired",
  PENDING: "Payment pending",
};

/** Tag Payment, User, dan Admin. Webhook sekaligus menjadi simulator hasil pembayaran di mode mock. */
export function paymentHandlers(state: MockState, baseUrl: string) {
  const withBooking = (request: Request, bookingId: string) => {
    const grant = requireGrant(state, request, { checkExpiry: false });
    if (grant instanceof Response) return grant;
    return requireBooking(state, grant, bookingId);
  };

  const paidTickets = () =>
    [...state.bookings.values()]
      .filter((booking) => booking.status === "PAID")
      .flatMap((booking) => booking.tickets.map((ticket) => ({ booking, ticket })));

  return [
    // Didaftarkan sebelum `/payments/:bookingId` supaya "webhook" tidak terbaca sebagai booking_id.
    // Format Midtrans Core API: tanda tangan ada di body (`signature_key`), bukan header.
    http.post(`${baseUrl}/payments/webhook`, async ({ request }) => {
      const body = await readJson(request);
      if (typeof field(body, "signature_key") !== "string") return fail(401, "Invalid signature");
      // `order_id` bisa membawa nomor percobaan ("RB-00912:2"); booking_id ada sebelum titik dua.
      const booking = state.bookings.get(String(field(body, "order_id")).split(":")[0] ?? "");
      if (!booking) return fail(404, "Booking not found");
      state.refreshBooking(booking, Date.now());
      const status = field(body, "transaction_status");
      if (booking.status === "PENDING_PAYMENT" && booking.payment?.status === "PENDING") {
        if (status === "settlement" || status === "capture") state.markPaid(booking, Date.now());
        if (status === "deny" || status === "cancel" || status === "expire") {
          booking.payment.status = "FAILED";
          booking.payment.failureReason = "Kartu ditolak penerbit";
        }
      }
      return ok({}, { message: "Callback processed" });
    }),

    http.get(`${baseUrl}/payments/:bookingId/methods`, ({ params, request }) => {
      const booking = withBooking(request, String(params.bookingId));
      if (booking instanceof Response) return booking;
      return ok({
        methods: [
          {
            id: "bank_transfer",
            name: "Transfer Bank / Virtual Account",
            description: "Verifikasi otomatis.",
            icon_url: "/icons/bank.svg",
            enabled: true,
            banks: BANKS.map((bank) => ({ ...bank, icon_url: `/icons/${bank.code}.svg` })),
          },
          {
            id: "gopay",
            name: "E-Wallet (GoPay / QRIS)",
            description: "Scan QR.",
            icon_url: "/icons/ewallet.svg",
            enabled: true,
          },
        ],
      });
    }),

    http.post(`${baseUrl}/payments/:bookingId`, async ({ params, request }) => {
      const booking = withBooking(request, String(params.bookingId));
      if (booking instanceof Response) return booking;
      if (booking.status !== "PENDING_PAYMENT")
        return fail(409, `Booking is ${booking.status}`, {}, "BOOKING_STATUS_INVALID");
      if (booking.payment?.status === "PENDING") return fail(409, "Payment already initiated");
      const body = await readJson(request);
      const method = field(body, "method");
      const bank = field(body, "bank");
      if (method !== "bank_transfer" && method !== "gopay")
        return fail(400, "method must be bank_transfer or gopay");
      if (method === "bank_transfer" && !BANKS.some((item) => item.code === bank))
        return fail(400, "bank is required for bank_transfer");

      booking.payment = {
        id: `${booking.id}:${booking.attempt}`,
        method,
        bank: method === "bank_transfer" ? String(bank) : null,
        status: "PENDING",
        failureReason: null,
      };
      const now = Date.now();
      return ok(
        {
          payment_id: booking.payment.id,
          method,
          status: "PENDING",
          instructions: instructions(booking),
          ttl: {
            expires_at: iso(booking.paymentExpiresAt),
            ttl_seconds: ttlSeconds(booking.paymentExpiresAt, now),
            server_time: iso(now),
          },
        },
        { message: "Payment initiated" },
      );
    }),

    // Batalkan pembayaran yang berjalan supaya customer bisa ganti metode; TTL booking tidak diperpanjang.
    http.post(`${baseUrl}/payments/:bookingId/retry`, ({ params, request }) => {
      const booking = withBooking(request, String(params.bookingId));
      if (booking instanceof Response) return booking;
      if (booking.status !== "PENDING_PAYMENT" || !booking.payment) return fail(409, "No payment to cancel");
      const cancelledOrderId = booking.payment.id;
      booking.payment = null;
      booking.attempt += 1;
      return ok(
        {
          booking_id: booking.id,
          status: "HELD",
          attempt: booking.attempt,
          cancelled_order_id: cancelledOrderId,
          payment_expires_at: iso(booking.paymentExpiresAt),
          server_time: new Date().toISOString(),
        },
        { message: "Previous payment cancelled" },
      );
    }),

    http.get(`${baseUrl}/payments/:bookingId/status`, ({ params, request }) => {
      const booking = withBooking(request, String(params.bookingId));
      if (booking instanceof Response) return booking;
      const body = statusBody(booking, Date.now());
      return ok(body, { message: STATUS_MESSAGE[body.status] });
    }),

    http.get(`${baseUrl}/users/me/tickets`, ({ request }) => {
      if (!hasBearer(request)) return fail(401, "Unauthorized");
      const url = new URL(request.url);
      const filter = url.searchParams.get("status") ?? "all";
      const today = new Date().toISOString().slice(0, 10);
      const tickets = paidTickets()
        .map(({ booking, ticket }) => {
          const event = state.findEvent(booking.eventId);
          return {
            ticket_id: ticket.ticketId,
            booking_id: booking.id,
            event: {
              id: booking.eventId,
              name: event?.name ?? "",
              date: event?.date ?? "",
              venue: event?.venue ?? "",
              image_url: event?.imageUrl ?? "",
            },
            category: ticket.category,
            price: ticket.price,
            status: (event?.date ?? "") < today ? "EXPIRED" : "VALID",
            eticket_url: `/tickets/${ticket.ticketId}/eticket?t=mock-${ticket.ticketId}`,
          };
        })
        .filter((ticket) => {
          if (filter === "upcoming") return ticket.status === "VALID";
          if (filter === "past") return ticket.status !== "VALID";
          return true;
        });
      const { page, pagination } = paginate(tickets, url);
      return ok(page, { pagination });
    }),

    // Akses lewat sesi akun atau `?t=` dari email e-tiket (FR-26).
    http.get(`${baseUrl}/tickets/:ticketId/eticket`, ({ params, request }) => {
      if (!hasBearer(request) && !new URL(request.url).searchParams.get("t"))
        return fail(401, "Unauthorized");
      const found = paidTickets().find(({ ticket }) => ticket.ticketId === params.ticketId);
      if (!found) return fail(404, "Ticket not found");
      const { booking, ticket } = found;
      const event = state.findEvent(booking.eventId);
      return ok({
        ticket_id: ticket.ticketId,
        event: {
          name: event?.name ?? "",
          date: event?.date ?? "",
          time: event?.time ?? "",
          venue: event ? `${event.venue}, ${event.city}` : "",
        },
        category: ticket.category,
        holder: { nik_masked: maskNik(ticket.nik) },
        qr_code:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        qr_value: `${ticket.ticketId}|${booking.eventId}|${ticket.nik}`,
        instructions: "Tunjukkan QR code dan identitas pemegang saat masuk venue.",
      });
    }),

    http.get(`${baseUrl}/admin/reconciliation/disputed`, ({ request }) => {
      const eventId = new URL(request.url).searchParams.get("event_id");
      if (!eventId) return fail(400, "event_id is required");
      const disputed =
        eventId === "evt_konser_a"
          ? [
              {
                booking_id: "RB-00912",
                order_id: "RB-00912:2",
                gateway_event_id: "evt_9f2a1c7b",
                gross_amount: 1_500_000,
                payment_type: "bank_transfer",
                paid_at: "2026-10-26T10:25:48Z",
                cancelled_at: "2026-10-26T10:25:30Z",
                contact_email: "buyer@example.com",
                refund_status: "PENDING_MANUAL",
              },
            ]
          : [];
      return ok({ disputed });
    }),
  ];
}
