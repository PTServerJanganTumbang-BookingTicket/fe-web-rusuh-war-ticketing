import { z } from "zod";
import { QUEUE_POLL_FALLBACK_MS } from "../domain/queue.constants";
import type { QueueEvent } from "../domain/queue-event.model";
import type { QueueState } from "../domain/queue-state.model";

/**
 * `data` dari `POST /events/{event_id}/queue/join`. Ada tiga bentuk: antrian baru, join ulang (`rejoined`, tanpa
 * `event`), dan antrian kosong yang langsung diberi giliran (`granted`, tanpa nomor). Kontrak tidak membawa estimasi
 * tunggu: ETA dihitung dari `rate_per_min` di `/queue/serving`.
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
  /** Detik per posisi, dari laju antrian server; 0 bila laju belum diketahui. */
  secondsPerPosition: number;
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

/** Pesan SSE antrian yang dipakai FE. Token tidak pernah lewat SSE; `grant` hanya pemicu panggilan `/queue/me`. */
export type QueueStreamMessage =
  { type: "serving"; nowServing: number } | { type: "grant" } | { type: "closed" };

export const queueStreamSchemas = {
  message: z
    .object({ nowServing: z.number() })
    .transform((event): QueueStreamMessage => ({ type: "serving", nowServing: event.nowServing })),
  grant: z.unknown().transform((): QueueStreamMessage => ({ type: "grant" })),
  "sold-out": z.unknown().transform((): QueueStreamMessage => ({ type: "closed" })),
};

/** Posisi dihitung dari tiket customer dan now_serving event (kontrak: position = ticket_no − now_serving). */
export function waitingState(ticket: QueueTicket, nowServing: number): QueueState {
  const position = Math.max(ticket.ticketNo - nowServing, 0);
  return {
    status: "waiting",
    eventName: ticket.eventName,
    position,
    joinedPosition: ticket.joinedPosition,
    etaSeconds: Math.round(position * ticket.secondsPerPosition),
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
