import { z } from "zod";
import { QUEUE_POLL_FALLBACK_MS } from "../domain/queue.constants";
import type { QueueEvent } from "../domain/queue-event.model";
import type { QueuePollTier } from "../domain/queue-poll.rules";
import type { QueueState } from "../domain/queue-state.model";

/**
 * `data` dari `POST /events/{event_id}/queue/join`. Ada tiga bentuk: antrian baru, join ulang (`rejoined`, tanpa
 * `event`), dan antrian kosong yang langsung diberi giliran (`granted`, tanpa nomor). Kontrak tidak membawa estimasi
 * tunggu: estimasi dihitung dari laju antrian (`ratePerMin` di stream, `rate_per_min` di `/queue/serving`).
 * Tanpa `now_serving`, nilainya diturunkan dari rumus kontrak: `ticket_no − position`.
 */
export const queueJoinSchema = z
  .object({
    ticket_no: z.number().optional(),
    position: z.number().optional(),
    now_serving: z.number().optional(),
    state: z.string().optional(),
    queue_token: z.string().nullish(),
    sse_url: z.string().nullish(),
  })
  .transform((join): QueueJoin => {
    const ticketNo = join.ticket_no ?? 0;
    const joinedPosition = join.position ?? 0;
    return {
      ticketNo,
      joinedPosition,
      queueToken: join.queue_token ?? undefined,
      streamUrl: join.sse_url ?? undefined,
      nowServing: join.now_serving ?? ticketNo - joinedPosition,
      state: join.state,
    };
  });

type QueueTicketCore = {
  ticketNo: number;
  joinedPosition: number;
  /** Token ruang tunggu; hanya dipakai bila cookie tidak bisa dipakai (header `X-Queue-Token`). */
  queueToken?: string;
  /** URL stream dari server (absolut: stream ada di host lain). Kosong berarti path bawaan di host API. */
  streamUrl?: string;
};

/** Hasil join apa adanya. `nowServing` dan `state` hanya untuk menentukan hasil join; tidak disimpan di tiket. */
export type QueueJoin = QueueTicketCore & {
  nowServing: number;
  /** State customer bila server mengirimnya (join ulang): selain `QUEUED` berarti state diambil dari `/queue/me`. */
  state?: string;
};

/** Tiket antrian customer di satu event, dipakai bersama service HTTP dan SSE. */
export type QueueTicket = QueueTicketCore & {
  eventName: string;
  /** Laju antrian terakhir yang diketahui (nomor per menit); 0 bila belum diketahui. */
  ratePerMin: number;
};

/**
 * `data` dari `GET /events/{event_id}/queue/serving` (polling cadangan, kontrak §3.4). Interval berikutnya dipilih
 * dari `poll_tiers` menurut posisi (lihat `pollAfterMs`), dengan `poll_after_ms` sebagai bawaan.
 */
export const queueServingSchema = z
  .object({
    now_serving: z.number(),
    rate_per_min: z.number(),
    state: z.string().optional(),
    poll_after_ms: z.number().optional(),
    poll_tiers: z
      .array(z.object({ max_position: z.number().nullable(), poll_after_ms: z.number() }))
      .optional(),
  })
  .transform((serving): QueueServing => ({
    nowServing: serving.now_serving,
    ratePerMin: serving.rate_per_min,
    saleState: serving.state,
    pollAfterMs: serving.poll_after_ms,
    pollTiers: (serving.poll_tiers ?? []).map((tier) => ({
      maxPosition: tier.max_position,
      pollAfterMs: tier.poll_after_ms,
    })),
  }));

export type QueueServing = {
  nowServing: number;
  ratePerMin: number;
  saleState?: string;
  pollAfterMs?: number;
  pollTiers: QueuePollTier[];
};

/** `data` dari `GET /events/{event_id}` untuk join: nama event dan konfigurasi CAPTCHA (bisa tidak ada). */
export const queueJoinEventSchema = z
  .object({
    name: z.string(),
    captcha: z.object({ provider: z.string(), site_key: z.string() }).nullish(),
  })
  .transform((event) => ({
    name: event.name,
    captcha: event.captcha ? { provider: event.captcha.provider, siteKey: event.captcha.site_key } : null,
  }));

// Tenggat hanya pelengkap tampilan; grant-nya yang menentukan customer boleh lanjut, jadi tenggat yang tidak
// terkirim tidak boleh menggagalkan pemulihan (kontrak §3.3).
const grantedStates = z.object({
  state: z.enum(["GRANTED", "SELECTING"]),
  grant_token: z.string(),
  booking_expires_at: z.string().nullish(),
});

/**
 * `data` dari `GET /events/{event_id}/queue/me`: state customer di mesin antrian (kontrak §3.3). Selain keadaan di
 * tabel kontrak, `LAPSED` dan `ABANDONED` (keadaan akhir tanpa grant, §3.3 dan Appendix) berarti sama dengan
 * `EXPIRED`. State yang sama sekali tidak dikenal sengaja gagal di-parse: controller menampilkan galat dan tombol
 * coba lagi, bukan layar tunggu yang diam.
 */
export const queueMeSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("QUEUED"), ticket_no: z.number(), now_serving: z.number() }),
  grantedStates.extend({ state: z.literal("GRANTED") }),
  grantedStates.extend({ state: z.literal("SELECTING") }),
  // `HELD` (v2.27): Bayar sudah ditekan, kursi di-hold, pembayaran belum dimulai. Sebelumnya dilaporkan `SELECTING`.
  z.object({
    state: z.literal("HELD"),
    grant_token: z.string(),
    booking_id: z.string().nullish(),
    payment_expires_at: z.string().nullish(),
  }),
  z.object({
    state: z.literal("AWAITING_PAYMENT"),
    grant_token: z.string(),
    booking_id: z.string().nullish(),
    payment_expires_at: z.string().nullish(),
  }),
  z.object({ state: z.literal("CONFIRMED") }),
  z.object({ state: z.literal("EXPIRED") }),
  z.object({ state: z.literal("LAPSED") }),
  z.object({ state: z.literal("ABANDONED") }),
]);

export type QueueMe = z.infer<typeof queueMeSchema>;

/** State sale di stream (kontrak §3.2, v2.12). `FULL_BOOKED` reversibel; hanya `CLOSED` yang final. */
export type QueueSaleState = "SCHEDULED" | "OPEN" | "FULL_BOOKED" | "CLOSED";

const saleStateSchema = z.enum(["SCHEDULED", "OPEN", "FULL_BOOKED", "CLOSED"]);

/**
 * Pesan SSE antrian yang dipakai FE. Token tidak pernah lewat SSE: saat `nowServing >= ticket_no` klien memanggil
 * `GET /queue/me`. Teks `message` dari server tidak dipakai untuk bercabang, hanya `stale`, `state`, dan nama event.
 */
export type QueueStreamMessage =
  /** `ratePerMin` kosong berarti pesan tidak membawa laju: laju terakhir tetap dipakai. */
  | { type: "serving"; nowServing: number; saleState: QueueSaleState; ratePerMin?: number }
  | { type: "status"; saleState: QueueSaleState }
  | { type: "stale"; stale: boolean; saleState: QueueSaleState }
  | { type: "closed" }
  | { type: "reconnect" };

export const queueStreamSchemas = {
  message: z
    .object({ nowServing: z.number(), state: saleStateSchema, ratePerMin: z.number().optional() })
    .transform((event): QueueStreamMessage => ({
      type: "serving",
      nowServing: event.nowServing,
      saleState: event.state,
      ratePerMin: event.ratePerMin,
    })),
  status: z
    .object({ state: saleStateSchema })
    .transform((event): QueueStreamMessage => ({ type: "status", saleState: event.state })),
  stale: z.object({ stale: z.boolean(), state: saleStateSchema }).transform((event): QueueStreamMessage => ({
    type: "stale",
    stale: event.stale,
    saleState: event.state,
  })),
  "sold-out": z.unknown().transform((): QueueStreamMessage => ({ type: "closed" })),
  reconnect: z.unknown().transform((): QueueStreamMessage => ({ type: "reconnect" })),
};

/** Posisi dihitung dari tiket customer dan now_serving event (kontrak: position = ticket_no − now_serving). */
export function waitingState(
  ticket: QueueTicket,
  nowServing: number,
  live: { fullBooked?: boolean; stale?: boolean; retryAfterMs?: number } = {},
): QueueState {
  const position = Math.max(ticket.ticketNo - nowServing, 0);
  return {
    status: "waiting",
    eventName: ticket.eventName,
    fullBooked: live.fullBooked ?? false,
    stale: live.stale ?? false,
    position,
    joinedPosition: ticket.joinedPosition,
    ratePerMin: ticket.ratePerMin,
    retryAfterMs: live.retryAfterMs ?? QUEUE_POLL_FALLBACK_MS,
  };
}

export function toQueueState(ticket: QueueTicket, me: QueueMe): QueueState {
  const { eventName } = ticket;
  switch (me.state) {
    case "QUEUED":
      // Nomor dari server: tiket tersimpan bisa tanpa nomor (join yang langsung diberi giliran).
      return waitingState({ ...ticket, ticketNo: me.ticket_no }, me.now_serving);
    case "GRANTED":
    case "SELECTING":
      return {
        status: "admitted",
        eventName,
        accessToken: me.grant_token,
        expiresAt: me.booking_expires_at ?? undefined,
      };
    case "HELD":
    case "AWAITING_PAYMENT":
      // Bayar sudah ditekan: tujuannya halaman Payment dengan tenggat pembayaran, bukan Detail Ticket (kontrak §3.3).
      return {
        status: "admitted",
        eventName,
        accessToken: me.grant_token,
        expiresAt: me.payment_expires_at ?? undefined,
        paymentBookingId: me.booking_id ?? undefined,
      };
    case "CONFIRMED":
      return { status: "ended", eventName, reason: "confirmed" };
    case "EXPIRED":
    case "LAPSED":
    case "ABANDONED":
      return { status: "ended", eventName, reason: "expired" };
  }
}

/** `data` dari `GET /events/{event_id}`, hanya bagian yang dipakai kartu event di Waiting Room. */
export const queueEventSchema = z
  .object({
    name: z.string(),
    category: z.string(),
    location: z.object({ venue: z.string(), city: z.string() }),
    date: z.string(),
    image_url: z.string(),
  })
  .transform((event): QueueEvent => ({
    name: event.name,
    category: event.category,
    city: event.location.city,
    venue: event.location.venue,
    date: event.date,
    imageUrl: event.image_url,
  }));
