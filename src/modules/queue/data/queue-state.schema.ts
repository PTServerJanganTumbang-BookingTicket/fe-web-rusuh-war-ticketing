import { z } from "zod";
import { QUEUE_POLL_FALLBACK_MS } from "../domain/queue.constants";
import type { QueueState } from "../domain/queue-state.model";

/** `data` dari `POST /events/{event_id}/queue/join`. */
export const queueJoinSchema = z
  .object({
    ticket_no: z.number(),
    now_serving: z.number(),
    position: z.number(),
    estimated_wait_minutes: z.number(),
    event: z.object({ id: z.string(), name: z.string() }),
  })
  .transform((join) => ({
    eventName: join.event.name,
    ticketNo: join.ticket_no,
    joinedPosition: join.position,
    // Laju dari estimasi server, dipakai untuk ETA saat posisi bergerak.
    secondsPerPosition: join.position > 0 ? (join.estimated_wait_minutes * 60) / join.position : 0,
  }));

export type QueueTicket = z.infer<typeof queueJoinSchema>;

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
