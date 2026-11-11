import { createEvents, maskNik, type MockEvent } from "./fixtures";

export type ScenarioConfig = {
  /** Kenaikan now_serving per poll atau tick SSE. 0 berarti antrian macet. */
  servingStep: number;
  bookingTtlMs: number;
  paymentTtlMs: number;
};

export type QueueEntry = {
  token: string;
  eventId: string;
  ticketNo: number;
  deviceId: string | null;
  grantToken: string | null;
};

export type Grant = { token: string; eventId: string; deviceId: string | null; expiresAt: number };

export type BookedTicket = {
  ticketId: string | null;
  categoryId: string;
  category: string;
  price: number;
  nik: string;
  holderName: string;
  holderEmail: string;
};

export type Payment = {
  id: string;
  method: "bank_transfer" | "gopay";
  bank: string | null;
  status: "PENDING" | "FAILED" | "CANCELLED";
  failureReason: string | null;
};

export type Booking = {
  id: string;
  eventId: string;
  grantToken: string;
  status: "PENDING_PAYMENT" | "PAID" | "EXPIRED";
  tickets: BookedTicket[];
  contactEmail: string;
  paymentExpiresAt: number;
  attempt: number;
  payment: Payment | null;
  paidAt: number | null;
  paidWith: Payment["method"] | null;
};

/** `nik` lengkap ikut dikirim ke pemiliknya; asumsi FE untuk memilih alias di Detail Ticket (contract-assumptions.md). */
export type SavedNik = {
  id: string;
  nik: string;
  nikMasked: string;
  label: string;
  verifiedAt: string;
};

export type MockState = ReturnType<typeof createMockState>;

const INITIAL_NOW_SERVING = 31_500;
const JOINED_POSITION = 1_248;

/** State satu instance handler. Dibuat ulang per `createHandlers` supaya test dan tab tidak saling bocor. */
export function createMockState(config: ScenarioConfig) {
  const events = createEvents();
  /** now_serving milik event; tiket antrian milik customer, dikunci queue_token. */
  const nowServing = new Map<string, number>();
  const queue = new Map<string, QueueEntry>();
  /**
   * Cookie yang diset response mock. MSW tidak menyimpan Set-Cookie untuk host API lintas origin,
   * jadi request yang tidak memakai `credentials: "omit"` membaca cookie dari sini (jsdom tidak meneruskan `include`).
   */
  const cookieJar = new Map<string, string>();
  const grants = new Map<string, Grant>();
  const bookings = new Map<string, Booking>();
  const usedNiks = new Set<string>();
  const magicLinkCooldown = new Map<string, number>();
  const refreshTokens = new Set<string>();
  const savedNiks: SavedNik[] = [
    {
      id: "snk_1",
      nik: "3171000000000033",
      nikMasked: maskNik("3171000000000033"),
      label: "Budi",
      verifiedAt: "2026-10-20T08:11:00Z",
    },
  ];
  let sequence = 0;
  const nextId = (prefix: string) => `${prefix}${String(++sequence).padStart(3, "0")}`;

  const findEvent = (eventId: string): MockEvent | undefined => events.find((event) => event.id === eventId);

  const servingOf = (eventId: string) => nowServing.get(eventId) ?? INITIAL_NOW_SERVING;

  function joinQueue(eventId: string, deviceId: string | null): QueueEntry {
    const entry: QueueEntry = {
      token: `qt_${nextId("")}`,
      eventId,
      ticketNo: servingOf(eventId) + JOINED_POSITION,
      deviceId,
      grantToken: null,
    };
    queue.set(entry.token, entry);
    return entry;
  }

  /** Antrian yang tidak bergerak (skenario `queue-stuck`) melaporkan laju 0, seperti sebelum booking pertama diproses. */
  const isQueueMoving = () => config.servingStep > 0;

  /** Memajukan now_serving satu langkah (poll atau tick SSE). */
  function advanceServing(eventId: string): number {
    const next = servingOf(eventId) + config.servingStep;
    nowServing.set(eventId, next);
    return next;
  }

  /** Grant dibuat sekali, saat customer yang gilirannya tiba bertanya lewat /queue/me atau SSE. */
  function grantIfDue(entry: QueueEntry, now: number): Grant | undefined {
    if (!entry.grantToken && servingOf(entry.eventId) >= entry.ticketNo) {
      const token = `gt_${nextId("")}`;
      grants.set(token, {
        token,
        eventId: entry.eventId,
        deviceId: entry.deviceId,
        expiresAt: now + config.bookingTtlMs,
      });
      entry.grantToken = token;
    }
    return entry.grantToken ? grants.get(entry.grantToken) : undefined;
  }

  function releaseStock(booking: Booking) {
    const event = findEvent(booking.eventId);
    for (const ticket of booking.tickets) {
      const category = event?.categories.find((item) => item.id === ticket.categoryId);
      if (category) category.available += 1;
      usedNiks.delete(`${booking.eventId}:${ticket.nik}`);
    }
  }

  /** Status booking diturunkan dari waktu, bukan timer, supaya TTL konsisten di semua endpoint. */
  function refreshBooking(booking: Booking, now: number): Booking {
    if (booking.status === "PENDING_PAYMENT" && now >= booking.paymentExpiresAt) {
      booking.status = "EXPIRED";
      releaseStock(booking);
    }
    return booking;
  }

  function markPaid(booking: Booking, now: number) {
    booking.status = "PAID";
    booking.paidAt = now;
    booking.paidWith = booking.payment?.method ?? "bank_transfer";
    booking.payment = null;
    for (const ticket of booking.tickets) ticket.ticketId = nextId("TKT-");
  }

  function seedPaidBooking() {
    const booking: Booking = {
      id: "RB-00912",
      eventId: "evt_konser_a",
      grantToken: "gt_seed",
      status: "PAID",
      tickets: [
        {
          ticketId: "TKT-001",
          categoryId: "cat_vip",
          category: "VIP",
          price: 1_500_000,
          nik: "3171000000000022",
          holderName: "JOHN DOE",
          holderEmail: "buyer@example.com",
        },
        {
          ticketId: "TKT-002",
          categoryId: "cat_festival",
          category: "Festival",
          price: 850_000,
          nik: "3171000000000033",
          holderName: "JANE DOE",
          holderEmail: "jane@example.com",
        },
      ],
      contactEmail: "buyer@example.com",
      paymentExpiresAt: Date.parse("2026-10-23T13:25:00Z"),
      attempt: 1,
      payment: null,
      paidAt: Date.parse("2026-10-23T13:20:00Z"),
      paidWith: "bank_transfer",
    };
    bookings.set(booking.id, booking);
  }
  seedPaidBooking();

  return {
    config,
    events,
    queue,
    cookieJar,
    grants,
    bookings,
    usedNiks,
    magicLinkCooldown,
    refreshTokens,
    savedNiks,
    nextId,
    findEvent,
    servingOf,
    isQueueMoving,
    joinQueue,
    advanceServing,
    grantIfDue,
    releaseStock,
    refreshBooking,
    markPaid,
  };
}
