import { z } from "zod";
import { QUEUE_POLL_FALLBACK_MS } from "../domain/queue.constants";
import type { QueueEvent } from "../domain/queue-event.model";
import type { QueueState } from "../domain/queue-state.model";

/**
 * `data` dari `POST /events/{event_id}/queue/join`. Ada tiga bentuk: antrian baru, join ulang (`rejoined`, tanpa
 * `event`), dan antrian kosong yang langsung diberi giliran (`granted`, tanpa nomor). Kontrak tidak membawa estimasi
 * tunggu: estimasi dihitung dari laju antrian (`ratePerMin` di stream, `rate_per_min` di `/queue/serving`).
 */
export const queueJoinSchema = z
  .object({
    ticket_no: z.number().optional(),
    position: z.number().optional(),
  })
  .transform((join) => ({ ticketNo: join.ticket_no ?? 0, joinedPosition: join.position ?? 0 }));

export type QueueJoin = z.infer<typeof queueJoinSchema>;

/** Tiket antrian customer di satu event, dipakai bersama service HTTP dan SSE. */
export type QueueTicket = QueueJoin & {
  eventName: string;
  /** Laju antrian terakhir yang diketahui (nomor per menit); 0 bila belum diketahui. */
  ratePerMin: number;
};

/** `data` dari `GET /events/{event_id}/queue/serving`; hanya laju yang dipakai FE. */
export const queueServingSchema = z.object({ rate_per_min: z.number() });

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

const grantedStates = z.object({
  state: z.enum(["GRANTED", "SELECTING"]),
  grant_token: z.string(),
  booking_expires_at: z.string(),
});

/** `data` dari `GET /events/{event_id}/queue/me`: state customer di mesin antrian (kontrak §3). */
export const queueMeSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("QUEUED"), ticket_no: z.number(), now_serving: z.number() }),
  grantedStates.extend({ state: z.literal("GRANTED") }),
  grantedStates.extend({ state: z.literal("SELECTING") }),
  z.object({ state: z.literal("AWAITING_PAYMENT"), grant_token: z.string(), payment_expires_at: z.string() }),
  z.object({ state: z.literal("CONFIRMED") }),
  z.object({ state: z.literal("EXPIRED") }),
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
  live: { fullBooked?: boolean; stale?: boolean } = {},
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
    retryAfterMs: QUEUE_POLL_FALLBACK_MS,
  };
}

export function toQueueState(ticket: QueueTicket, me: QueueMe): QueueState {
  const { eventName } = ticket;
  switch (me.state) {
    case "QUEUED":
      return waitingState(ticket, me.now_serving);
    case "GRANTED":
    case "SELECTING":
      return { status: "admitted", eventName, accessToken: me.grant_token, expiresAt: me.booking_expires_at };
    case "AWAITING_PAYMENT":
      return { status: "admitted", eventName, accessToken: me.grant_token, expiresAt: me.payment_expires_at };
    case "CONFIRMED":
      return { status: "ended", eventName, reason: "confirmed" };
    case "EXPIRED":
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
